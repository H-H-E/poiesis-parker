import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase"
import { OpenAIEmbeddings } from "@langchain/openai"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { supabase } from "@/lib/supabase/browser-client"
import type { Document } from "@langchain/core/documents"
import type { BaseMessage } from "@langchain/core/messages"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Tables } from "@/supabase/types"

export const CONVERSATION_MEMORY_TABLE_NAME = "conversation_memory_chunks"
export const CONVERSATION_MEMORY_MATCH_FUNCTION = "match_conversation_chunks"

/**
 * Chunks conversation history and stores it as vectors in Supabase.
 * Should ideally be run server-side or in a background job with appropriate API keys/clients.
 */
export async function ingestConversationHistory({
  chatId,
  userId,
  messages,
  client = supabase, // Default to browser client, but ideally pass service client
  embeddingApiKey, // Pass API key explicitly for server-side use
  chunkSize = 1000,
  chunkOverlap = 150
}: {
  chatId: string
  userId: string
  messages: Pick<Tables<"messages">, "role" | "content">[] | BaseMessage[] // Accept DB rows or LangChain messages
  client?: SupabaseClient
  embeddingApiKey?: string
  chunkSize?: number
  chunkOverlap?: number
}) {
  if (!messages || messages.length === 0) {
    console.log(`No messages provided for chat ${chatId}, skipping ingestion.`)
    return
  }

  // Format messages into a single text block or process per turn
  const conversationText = messages
    .map(m => {
      // Check if it's a BaseMessage instance or a DB row
      if ("_getType" in m) {
        return `${m._getType()}: ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`
      }
      return `${m.role}: ${m.content}`
    })
    .join("\n\n")

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize,
    chunkOverlap: chunkOverlap
  })

  // Create documents with metadata
  const docs: Document[] = await splitter.createDocuments(
    [conversationText],
    // Metadata attached to each chunk
    [
      {
        user_id: userId,
        chat_id: chatId,
        ingested_at: new Date().toISOString()
      }
    ]
  )

  if (docs.length === 0) {
    console.log(
      `Splitting produced no documents for chat ${chatId}, skipping ingestion.`
    )
    return
  }

  // Use explicit API key if provided (server-side context)
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: embeddingApiKey ?? process.env.OPENAI_API_KEY
  })

  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: client, // Use the provided client
    tableName: CONVERSATION_MEMORY_TABLE_NAME,
    queryName: CONVERSATION_MEMORY_MATCH_FUNCTION
  })

  try {
    const ids = await vectorStore.addDocuments(docs)
    console.log(
      `Ingested ${docs.length} chunks for chat ${chatId}. IDs: ${ids.join(", ")}`
    )
    return ids
  } catch (error) {
    console.error(`Error ingesting vector chunks for chat ${chatId}:`, error)
    throw new Error(`Failed to ingest conversation history for chat ${chatId}.`)
  }
}

/**
 * Initializes and returns a Supabase vector store retriever.
 * To be used in the RAG chain.
 */
export function getConversationMemoryRetriever({
  userId,
  client = supabase, // Default to browser client, pass appropriate client
  embeddingApiKey, // Pass API key if needed
  k = 4, // Number of documents to retrieve
  timeframe = "all" // Timeframe filter
}: {
  userId: string
  client?: SupabaseClient
  embeddingApiKey?: string
  k?: number
  timeframe?: string
}) {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: embeddingApiKey ?? process.env.OPENAI_API_KEY
  })
  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: client,
    tableName: CONVERSATION_MEMORY_TABLE_NAME,
    queryName: CONVERSATION_MEMORY_MATCH_FUNCTION
  })

  // TODO: Implement timeframe filtering logic if needed
  // This would need to be handled in the filter or at the database level

  return vectorStore.asRetriever({
    k: k,
    // Filter retrieved documents by the user ID stored in metadata
    filter: { user_id: userId }
  })
}
