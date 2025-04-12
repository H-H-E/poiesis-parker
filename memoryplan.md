
 

Okay, here is the plan for building a history processing pipeline for student preferences and memories in Poiesis Pete, structured in Markdown format and referencing your codebase:

# Poiesis Pete Memory Pipeline Plan

This plan outlines the steps and considerations for implementing a sophisticated memory system for the Poiesis Pete chatbot, leveraging LangChain.js and integrating with the existing Next.js and Supabase stack.

## 1. LangChain Usefulness Assessment

**Conclusion:** Yes, LangChain.js is highly relevant and beneficial for this task.

**Reasons:**

*   **Comprehensive Framework:** LangChain provides orchestration tools (LCEL, LangGraph) and building blocks beyond just memory, enabling custom pipeline creation.
*   **Memory Components:** Offers concepts for:
    *   `ChatMessageHistory` management (See `docs/concepts/chat_history/`, `docs/how_to/message_history/`).
    *   **Retrieval Augmented Generation (RAG):** Fundamental for semantic memory. Includes:
        *   `DocumentLoaders`: For ingesting student interactions.
        *   `TextSplitters`: For chunking conversations/notes (relevant to `lib/retrieval/processing/index.ts`).
        *   `EmbeddingModels`: For vectorizing text.
        *   `VectorStores`: Interfaces like `SupabaseVectorStore` for `pgvector`.
        *   `Retrievers`: For fetching relevant information.
*   **Structured Data Handling:** Can interact with SQL (Supabase via `lib/supabase/client.ts`) and supports structured data extraction (useful for explicit preferences defined in `types/`). See `docs/how_to/structured_output/`, `docs/concepts/tool_calling/`.
*   **Orchestration:**
    *   **LCEL (LangChain Expression Language):** Declarative chaining of components (`docs/concepts/lcel/`).
    *   **LangGraph.js:** Ideal for stateful memory management and complex workflows (`docs/concepts/architecture/#langchainlanggraph`, `https://langchain-ai.github.io/langgraphjs/`).
*   **Stack Integration:** Excellent TypeScript support and specific Supabase integrations (`SupabaseVectorStore`, `ChatMessageHistory`) fit well with the Poiesis Pete stack (Next.js, TypeScript, Supabase).

## 2. LangChain vs. mem0

*   **mem0:** Specialized memory tool (vector + graph) offering a ready-made API/SDK.
*   **LangChain:** Broader framework to *build* memory systems using its components, integrating tightly with RAG, tools, agents.
*   **Integration:** `mem0` could potentially be wrapped as a LangChain `Tool` (`docs/concepts/tools/`) or `Runnable` (`docs/concepts/runnables/`) calling its API/SDK (`/docs/open-source/node-quickstart.mdx`).
*   **Necessity:** `mem0` is likely **not necessary**. LangChain provides the tools to replicate similar functionality using your existing Supabase (`pgvector` for semantic, tables for structured). Use `mem0` only if its specific implementation details (graph structure, pre-built API) are critical and building them isn't desired.

## 3. Memory Features & Pipeline Stages (Prioritized)

Here's a prioritized list of memory features to implement:

1.  **Conversation History Management (Essential)**
    *   **Feature:** Store/retrieve message sequences per session. Implement truncation/summarization for context windows.
    *   **LangChain:** `ChatMessageHistory`, `BufferMemory`, `ConversationSummaryMemory`, LangGraph Checkpointers (`https://langchain-ai.github.io/langgraphjs/how-tos/persistence/`).
    *   **Poiesis Pete:** Currently likely handled by `db/messages.ts` and Supabase. LangChain can wrap or enhance this.

2.  **Semantic Memory (RAG on Past Interactions) (High Priority)**
    *   **Feature:** Store key conversation snippets/summaries as vectors in Supabase `pgvector`. Retrieve relevant past info semantically. Captures implicit preferences, learning patterns.
    *   **LangChain:** RAG components (`DocumentLoaders`, `TextSplitters`, `EmbeddingModels`, `SupabaseVectorStore`, `Retrievers`). See `docs/concepts/rag/`.
    *   **Poiesis Pete:** Utilizes Supabase client (`lib/supabase/client.ts`), `pgvector`.

3.  **Explicit Preference/Fact Extraction (Medium-High Priority)**
    *   **Feature:** Identify and extract structured info (e.g., "Favorite subject: Physics", "Struggling with: Algebra").
    *   **LangChain:** LLM Tool Calling (`docs/how_to/tool_calling/`) or Structured Output (`docs/how_to/structured_output/`, `withStructuredOutput`) using Zod schemas.
    *   **Poiesis Pete:** Define schemas in `types/`. Implement extraction logic, potentially in API routes (`app/api/chat/*`).

4.  **Structured Preference Storage & Retrieval (Medium-High Priority)**
    *   **Feature:** Store extracted structured facts (#3) in Supabase tables, linked to `user_id`. Retrieve as needed.
    *   **LangChain:** SQL/Database tools (`docs/tutorials/sql_qa/`) or custom Runnables/Tools wrapping Supabase client (`lib/supabase/client.ts`).
    *   **Poiesis Pete:** Requires schema changes (`supabase/migrations/`) and DB access logic (`db/*`).

5.  **Memory-Augmented Prompting (Core Integration)**
    *   **Feature:** Dynamically inject retrieved semantic memories (#2) and structured preferences (#4) into the LLM prompt along with conversation history (#1).
    *   **LangChain:** `ChatPromptTemplate`, `MessagesPlaceholder`, LCEL (`RunnablePassthrough.assign`), LangGraph state. See `docs/concepts/prompt_templates/`.
    *   **Poiesis Pete:** Modify prompt building logic (e.g., `lib/build-prompt.ts` or API routes).

6.  **Graph Memory (Advanced)**
    *   **Feature:** Model explicit relationships (e.g., "Student A" -> `likes` -> "Physics"). Useful for complex reasoning.
    *   **LangChain:** Graph DB integrations (`docs/tutorials/graph/`). Requires separate graph DB or advanced Supabase setup.
    *   **mem0:** Offers built-in Graph Memory (`/docs/open-source/graph_memory/overview.mdx`). Could be used as a LangChain Tool if critical.

7.  **Summarization & Long-Term Consolidation (Advanced)**
    *   **Feature:** Periodically summarize/consolidate memories to reduce token usage.
    *   **LangChain:** Summarization chains (`loadSummarizationChain`), LangGraph patterns. See `docs/how_to/chatbots_memory/`.

## 4. Detailed Plan: Feature #2 - Semantic Memory (RAG on Past Interactions)

**Objective:** Store conversation history chunks in Supabase `pgvector` and retrieve relevant ones to augment the chat prompt.

**LangChain Components:**

*   **History Access:** Use existing `db/messages.ts` or wrap with `ChatMessageHistory`.
*   **Chunking:** `RecursiveCharacterTextSplitter` (Ref: `lib/retrieval/processing/index.ts`).
*   **Embeddings:** `OpenAIEmbeddings` (using keys from `db/profile.ts` or selected `chatSettings.embeddingsProvider`).
*   **Vector Store:** `@langchain/community/vectorstores/supabase` using `lib/supabase/client.ts`.
*   **Retriever:** `vectorStore.asRetriever()` with `user_id` filtering.
*   **Orchestration:** LCEL `RunnableSequence` or `LangGraph`.

**Implementation Steps:**

1.  **Setup Supabase Table & Function:**
    *   Ensure a table exists (e.g., `conversation_memory_chunks`) with `content` (text), `metadata` (jsonb: `user_id`, `chat_id`, etc.), and `embedding` (`vector(1536)` for OpenAI). Update `supabase/migrations/`.
    *   Create a Supabase RPC function (e.g., `match_conversation_chunks`) for efficient vector similarity search with metadata filtering.

    ```sql
    -- Example SQL (Ensure pgvector is enabled: CREATE EXTENSION IF NOT EXISTS vector;)

    -- Create the table (adjust dimensions if needed)
    CREATE TABLE conversation_memory_chunks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      content text,
      metadata jsonb,
      embedding vector(1536) -- Dimension for text-embedding-ada-002
    );

    -- Create the index for efficient searching
    CREATE INDEX ON conversation_memory_chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100); -- Adjust 'lists' based on expected data size

    -- Create the RPC function for matching with metadata filter
    CREATE OR REPLACE FUNCTION match_conversation_chunks (
      query_embedding vector(1536),
      match_count int,
      filter jsonb DEFAULT '{}'
    ) RETURNS TABLE (
      id uuid,
      content text,
      metadata jsonb,
      similarity float
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RETURN QUERY
      SELECT
        cc.id,
        cc.content,
        cc.metadata,
        1 - (cc.embedding <=> query_embedding) AS similarity -- Cosine similarity
      FROM conversation_memory_chunks cc
      WHERE cc.metadata @> filter -- Match rows where metadata contains the filter JSON
      ORDER BY cc.embedding <=> query_embedding -- Order by distance (ascending)
      LIMIT match_count;
    END;
    $$;
    ```

2.  **Ingestion Logic:**
    *   Create a process (e.g., Supabase Edge Function, API route triggered post-chat, or background job) to fetch messages (`getMessagesByChatId` from `db/messages.ts`), chunk them, generate embeddings, and store them in `conversation_memory_chunks` using `SupabaseVectorStore.addDocuments`.

    ```typescript
    // Conceptual location: Edge Function, API route, or separate script
    import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
    import { OpenAIEmbeddings } from "@langchain/openai";
    import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
    import { supabase } from "@/lib/supabase/client"; // Ensure this is the admin or service client for writes
    import { Document } from "@langchain/core/documents";
    import { getMessagesByChatId } from "@/db/messages"; // Adjust import path as needed
    import { Tables } from "@/supabase/types"; // Assuming types helper

    async function ingestConversationHistory(chatId: string, userId: string) {
      const messages: Tables<"messages">[] = await getMessagesByChatId(chatId);
      if (!messages || messages.length === 0) {
        console.log(`No messages found for chat ${chatId}`);
        return;
      }

      // Combine messages - consider chunking per message or turn pair for better granularity
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join("\n\n");

      const splitter = new RecursiveCharacterTextSplitter({
         chunkSize: 1000, // Experiment with size
         chunkOverlap: 150, // Experiment with overlap
      });

      // Create documents with metadata
      const docs = await splitter.createDocuments(
         [conversationText],
         [{ user_id: userId, chat_id: chatId, ingested_at: new Date().toISOString() }]
      );

      // Use appropriate API key (likely from env vars server-side)
      const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });

      const vectorStore = new SupabaseVectorStore(embeddings, {
         client: supabase, // Use service role client if needed for writes
         tableName: "conversation_memory_chunks",
         queryName: "match_conversation_chunks", // Ensure this matches your RPC function
      });

      try {
        await vectorStore.addDocuments(docs);
        console.log(`Ingested ${docs.length} chunks for chat ${chatId}`);
      } catch (error) {
        console.error(`Error ingesting chunks for chat ${chatId}:`, error);
      }
    }
    ```

3.  **Retrieval and Generation Pipeline (LCEL):**
    *   Modify the chat API route (e.g., `app/api/chat/openai/route.ts`) to use a `RunnableSequence`.
    *   **Condense Question:** Rephrase the user's input as a standalone question using chat history.
    *   **Retrieve Context:** Use `SupabaseVectorStore.asRetriever()` configured with the `user_id` filter to fetch relevant chunks based on the standalone question.
    *   **Generate Answer:** Feed the original question, retrieved context, and chat history to the LLM via a final prompt.

    ```typescript
    // Conceptual location: Inside app/api/chat/[provider]/route.ts or similar
    import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
    import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
    import { StringOutputParser } from "@langchain/core/output_parsers";
    import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
    import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
    import { formatDocumentsAsString } from "langchain/util/document";
    import { supabase } from "@/lib/supabase/client"; // Ensure correct client instance
    import { BaseMessage } from "@langchain/core/messages";
    // Assume profile, chatSettings, sourceCount are available

    // --- Helper Function ---
    const formatChatHistory = (messages: BaseMessage[] | undefined) => {
      if (!messages || messages.length === 0) return "No history available.";
      return messages.map(msg => `${msg._getType()}: ${msg.content}`).join('\n');
    };

    // --- Chain Definition ---
    async function createRAGChain(userId: string, chatSettings: any, sourceCount: number) {
      const embeddings = new OpenAIEmbeddings({ openAIApiKey: chatSettings.openaiApiKey /* Or from env */ });
      const vectorStore = new SupabaseVectorStore(embeddings, {
        client: supabase, // Use appropriate client (user or service)
        tableName: "conversation_memory_chunks",
        queryName: "match_conversation_chunks"
      });

      const retriever = vectorStore.asRetriever({
        k: sourceCount,
        searchKwargs: { filter: { user_id: userId } } // Filter retrieved docs by user_id
      });

      const llm = new ChatOpenAI({
         openAIApiKey: chatSettings.openaiApiKey, // Or from env
         modelName: chatSettings.model,
         temperature: chatSettings.temperature,
         // streaming: true // Important for UI
      });

      const condenseQuestionPrompt = ChatPromptTemplate.fromMessages([
        new MessagesPlaceholder("chat_history"),
        ["human", "{question}"],
        ["ai", "Based on our previous conversation, what is a standalone version of the follow-up question: \"{question}\"?"],
      ]);

      const answerPrompt = ChatPromptTemplate.fromMessages([
        ["system", `You are a helpful assistant. Answer the user's question based *only* on the provided context and chat history. If the context doesn't contain the answer, say you don't know.
        Context:
        {context}`],
        new MessagesPlaceholder("chat_history"),
        ["human", "{question}"],
      ]);

      // Chain to get standalone question
      const standaloneQuestionChain = RunnableSequence.from([
        condenseQuestionPrompt,
        llm,
        new StringOutputParser(),
      ]);

      // Chain to retrieve documents and format them
      const retrieverChain = RunnableSequence.from([
        (input: { standalone_question: string }) => input.standalone_question,
        retriever,
        formatDocumentsAsString,
      ]);

      // Main RAG chain
      const conversationalRetrievalChain = RunnableSequence.from([
        RunnablePassthrough.assign({
          // Condense question only if chat history exists
          standalone_question: (input: { question: string; chat_history?: BaseMessage[] }) =>
            input.chat_history && input.chat_history.length > 1 // Needs at least one turn
              ? standaloneQuestionChain
              : input.question,
        }),
        RunnablePassthrough.assign({
          // Retrieve context based on the standalone question
          context: retrieverChain,
        }),
        // Pass inputs to the final answer prompt
        (input: { question: string; context: string; chat_history?: BaseMessage[] }) => ({
          question: input.question,
          context: input.context,
          chat_history: input.chat_history ?? [], // Ensure chat_history is always an array
        }),
        answerPrompt,
        llm,
        // new StringOutputParser() // Output parser might be handled by streaming logic
      ]);

      return conversationalRetrievalChain;
    }

    // --- Invocation in API Route ---
    // const { messages, /* ..., */ userId, chatSettings, sourceCount } = await req.json();
    // const currentQuestion = messages[messages.length - 1].content;
    // const chatHistory = messages.slice(0, -1).map(msg =>
    //   msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
    // );
    // const ragChain = await createRAGChain(userId, chatSettings, sourceCount);
    // const stream = await ragChain.stream({
    //    question: currentQuestion,
    //    chat_history: chatHistory
    // });
    // // Handle streaming response (e.g., using LangChainStream from ai package)
    ```

4.  **Integrate into Poiesis Pete:**
    *   Adapt the API route (`app/api/chat/[provider]/route.ts` or `app/api/chat/route.ts`) to call `createRAGChain` and handle its invocation.
    *   Pass `userId`, `chatSettings`, `sourceCount` (from `context/state` or request body).
    *   Ensure the correct Supabase client instance is used.
    *   Handle the output stream for the UI (Ref: `components/chat/chat-hooks/use-chat-handler.tsx`). Ensure the streaming logic correctly parses the LLM response.

## 5. Conclusion

LangChain.js offers a robust and flexible solution for building the desired memory pipeline within Poiesis Pete. Starting with Semantic Memory (RAG) using `SupabaseVectorStore` provides immediate value by allowing the chatbot to recall past interactions. Subsequent steps can layer in structured preference extraction and storage, progressively enhancing the chatbot's understanding of the student. Direct integration using LangChain components and Supabase is recommended over introducing `mem0` unless its specific features are deemed essential.
