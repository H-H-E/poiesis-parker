import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';

// Import our memory components
import { createMemoryAugmentedChain } from '@/lib/memory/memory-augmented-prompting';
import { processAndStoreConversationFacts } from '@/lib/memory/fact-management';
import { ingestConversationHistory } from '@/lib/memory/vector-memory';
import { SupabaseChatMessageHistory } from '@/lib/langchain/memory/supabase-chat-history';

// Messages interface with the expected client format
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize server-side Supabase client
    const supabase = createServerSupabaseClient({ req, res });
    
    // Get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check if user is authenticated
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userId = session.user.id;
    
    // Parse request body
    const { 
      chatId, 
      messages, 
      settings = {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        extractFacts: true
      }
    } = req.body;

    if (!chatId || !messages || messages.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user question from the latest message
    const latestMessage = messages[messages.length - 1];
    if (latestMessage.role !== 'user') {
      return res.status(400).json({ error: 'Last message must be from user' });
    }

    const userQuestion = latestMessage.content;
    
    // Create messaging history adapter for this chat
    const chatHistory = new SupabaseChatMessageHistory({
      chatId,
      userId,
      client: supabase
    });

    // Convert frontend message format to LangChain messages for history
    if (messages.length > 1) {
      // Convert previous messages to LangChain format and add them if they're not already in the DB
      // Note: In a production app, you'd check if messages are already in DB to avoid duplication
      const langchainMessages = messages.slice(0, -1).map((msg: Message): BaseMessage => {
        if (msg.role === 'user') {
          return new HumanMessage(msg.content);
        }
        return new AIMessage(msg.content);
      });
    }
    
    // Add latest user message
    await chatHistory.addUserMessage(userQuestion);

    // 1. Create the memory-augmented chain
    const { memoryAugmentedChain } = await createMemoryAugmentedChain({
      userId,
      chatId,
      supabaseClient: supabase,
      chatSettings: {
        model: settings.model,
        temperature: settings.temperature,
        openaiApiKey: process.env.OPENAI_API_KEY,
        extractFacts: settings.extractFacts
      },
      includeStructuredFacts: true,
      sourceCount: 3
    });

    // 2. Generate the response
    const result = await memoryAugmentedChain.invoke({
      question: userQuestion
    });

    // In a real implementation, you'd use streaming for better UX
    const aiResponse = result.content || result.text || String(result);
    
    // 3. Store the assistant's response in chat history
    await chatHistory.addAIChatMessage(aiResponse);

    // 4. After the chat, run background tasks for memory features
    // These operations could be moved to a separate background process for better performance
    
    // a. Extract and store structured facts (if enabled)
    if (settings.extractFacts) {
      const allMessages = await chatHistory.getMessages();
      
      // Process facts in the background
      processAndStoreConversationFacts({
        messages: allMessages,
        userId,
        chatId,
        llmApiKey: process.env.OPENAI_API_KEY,
        client: supabase
      }).catch(err => console.error("Background fact extraction failed:", err));
    }
    
    // b. Ingest conversation for semantic search (RAG)
    // Note: In production you might want to do this periodically rather than after each message
    const allMessages = await chatHistory.getMessages();
    ingestConversationHistory({
      chatId,
      userId,
      messages: allMessages,
      embeddingApiKey: process.env.OPENAI_API_KEY,
      client: supabase
    }).catch(err => console.error("Error ingesting conversation for RAG:", err));

    // 5. Return response to client
    return res.status(200).json({
      response: aiResponse
    });
    
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : String(error)
    });
  }
} 