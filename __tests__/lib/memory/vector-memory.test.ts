import { 
  ingestConversationHistory, 
  getConversationMemoryRetriever,
  CONVERSATION_MEMORY_TABLE_NAME,
  CONVERSATION_MEMORY_MATCH_FUNCTION
} from '@/lib/memory/vector-memory';
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BaseMessage } from "@langchain/core/messages";

// Mock dependencies
jest.mock("@langchain/community/vectorstores/supabase", () => {
  return {
    SupabaseVectorStore: jest.fn().mockImplementation(() => ({
      addDocuments: jest.fn().mockResolvedValue(['id1', 'id2', 'id3']),
      asRetriever: jest.fn().mockReturnValue({
        getRelevantDocuments: jest.fn().mockResolvedValue([])
      })
    }))
  };
});

jest.mock("@langchain/openai", () => {
  return {
    OpenAIEmbeddings: jest.fn().mockImplementation(() => ({
      embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
      embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3])
    }))
  };
});

jest.mock("langchain/text_splitter", () => {
  return {
    RecursiveCharacterTextSplitter: jest.fn().mockImplementation(() => ({
      createDocuments: jest.fn().mockImplementation((texts, metadatas) => {
        // Create simple document objects that match the expected structure
        return Promise.resolve(texts.map((text, i) => ({
          pageContent: text.substring(0, 50) + '...', // truncate for test
          metadata: metadatas[i]
        })));
      })
    }))
  };
});

describe('Vector Memory Tests', () => {
  const mockSupabase = {
    // Minimal mock implementation required for tests
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockReturnThis()
  } as unknown as SupabaseClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestConversationHistory', () => {
    test('successfully ingests conversation history as DB records', async () => {
      const userId = 'user123';
      const chatId = 'chat123';
      const messages = [
        { role: 'user', content: 'Hello, this is a test message' },
        { role: 'assistant', content: 'This is a response from the assistant' }
      ];

      await ingestConversationHistory({
        chatId,
        userId,
        messages,
        client: mockSupabase,
        embeddingApiKey: 'mock-api-key'
      });

      // Check that the text splitter was constructed correctly
      expect(RecursiveCharacterTextSplitter).toHaveBeenCalledWith({
        chunkSize: 1000,
        chunkOverlap: 150
      });

      // Check that OpenAIEmbeddings was constructed with the API key
      expect(OpenAIEmbeddings).toHaveBeenCalledWith({
        openAIApiKey: 'mock-api-key'
      });

      // Check that SupabaseVectorStore was constructed correctly
      expect(SupabaseVectorStore).toHaveBeenCalledWith(
        expect.any(Object), // The OpenAIEmbeddings instance
        {
          client: mockSupabase,
          tableName: CONVERSATION_MEMORY_TABLE_NAME,
          queryName: CONVERSATION_MEMORY_MATCH_FUNCTION
        }
      );

      // Get the instance to check addDocuments call
      const vectorStoreInstance = (SupabaseVectorStore as jest.Mock).mock.results[0].value;
      expect(vectorStoreInstance.addDocuments).toHaveBeenCalled();
    });

    test('handles LangChain BaseMessage objects', async () => {
      // Create mock BaseMessage objects
      const messages = [
        {
          _getType: () => 'human',
          content: 'Hello, this is a test message',
        } as unknown as BaseMessage,
        {
          _getType: () => 'ai',
          content: 'This is a response from the assistant',
        } as unknown as BaseMessage
      ];

      await ingestConversationHistory({
        chatId: 'chat123',
        userId: 'user123',
        messages,
        client: mockSupabase,
      });

      // Check that the text splitter received the correctly formatted input
      const textSplitterInstance = (RecursiveCharacterTextSplitter as jest.Mock).mock.results[0].value;
      expect(textSplitterInstance.createDocuments).toHaveBeenCalledWith(
        [expect.stringContaining('human: Hello')], // First part of the conversation text
        [expect.objectContaining({ user_id: 'user123', chat_id: 'chat123' })]
      );
    });

    test('skips ingestion for empty messages array', async () => {
      await ingestConversationHistory({
        chatId: 'chat123',
        userId: 'user123',
        messages: [],
        client: mockSupabase,
      });

      // No services should be called for empty messages
      expect(RecursiveCharacterTextSplitter).not.toHaveBeenCalled();
      expect(OpenAIEmbeddings).not.toHaveBeenCalled();
      expect(SupabaseVectorStore).not.toHaveBeenCalled();
    });

    test('handles errors during ingestion', async () => {
      // Setup the test to fail at the addDocuments step
      (SupabaseVectorStore as jest.Mock).mockImplementationOnce(() => ({
        addDocuments: jest.fn().mockRejectedValue(new Error('Mock DB error'))
      }));

      await expect(ingestConversationHistory({
        chatId: 'chat123',
        userId: 'user123',
        messages: [{ role: 'user', content: 'Test' }],
        client: mockSupabase,
      })).rejects.toThrow('Failed to ingest conversation history for chat chat123.');
    });
  });

  describe('getConversationMemoryRetriever', () => {
    test('creates a retriever with correct configuration', () => {
      const userId = 'user123';
      const embeddingApiKey = 'test-api-key';
      
      const retriever = getConversationMemoryRetriever({
        userId,
        client: mockSupabase,
        embeddingApiKey,
        k: 5,
        timeframe: 'recent'
      });

      // Check that OpenAIEmbeddings was constructed with the API key
      expect(OpenAIEmbeddings).toHaveBeenCalledWith({
        openAIApiKey: 'test-api-key'
      });

      // Check that SupabaseVectorStore was constructed correctly
      expect(SupabaseVectorStore).toHaveBeenCalledWith(
        expect.any(Object), // The OpenAIEmbeddings instance
        {
          client: mockSupabase,
          tableName: CONVERSATION_MEMORY_TABLE_NAME,
          queryName: CONVERSATION_MEMORY_MATCH_FUNCTION
        }
      );

      // Check that asRetriever was called with correct parameters
      const vectorStoreInstance = (SupabaseVectorStore as jest.Mock).mock.results[0].value;
      expect(vectorStoreInstance.asRetriever).toHaveBeenCalledWith({
        k: 5,
        filter: { user_id: 'user123' }
      });

      // Verify the retriever is returned
      expect(retriever).toBeDefined();
      expect(retriever.getRelevantDocuments).toBeDefined();
    });

    test('uses default parameters when not specified', () => {
      getConversationMemoryRetriever({
        userId: 'user123',
        client: mockSupabase
      });

      // Check that asRetriever was called with default parameters
      const vectorStoreInstance = (SupabaseVectorStore as jest.Mock).mock.results[0].value;
      expect(vectorStoreInstance.asRetriever).toHaveBeenCalledWith({
        k: 4, // Default value
        filter: { user_id: 'user123' }
      });
    });
  });
}); 