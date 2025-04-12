# Memory Architecture Documentation

## Overview

This document outlines the memory architecture used in the Poiesis Parker application, which implements several types of AI memory to provide context-aware, personalized interactions with users.

## Memory Types

The application implements three primary types of memory:

1. **Chat History Memory**: Basic conversation context using `SupabaseChatMessageHistory`
2. **Vector Memory**: Semantic search over past conversations using embeddings stored in Supabase
3. **Structured Facts Memory**: Extracted factual information about users stored in a structured format

## Technical Implementation

### 1. Chat History Memory

Implemented via `SupabaseChatMessageHistory` which:
- Stores messages in a Supabase `messages` table
- Supports standard LangChain message types (Human, AI, System, Tool)
- Handles serialization/deserialization between frontend format and LangChain format
- Allows for basic chat history recall and persistence

### 2. Vector Memory (RAG)

Implemented via:
- `ingestConversationHistory`: Processes conversations into vector chunks
- `getConversationMemoryRetriever`: Creates a retriever for semantic search
- Uses embeddings and Supabase vector extensions
- Enables retrieval of past relevant conversation snippets

### 3. Structured Facts Memory

Implemented via:
- `extractFactsFromMessages`: LLM-based extraction of structured information
- `processAndStoreConversationFacts`: Processes and stores facts in the database
- `getFactsForPrompt`: Retrieves facts for inclusion in prompts
- Categorizes information by fact types (preferences, struggles, goals, etc.)

## LLM Integration via OpenRouter

The memory system uses OpenRouter as a unified gateway for all LLM processing, providing several advantages:

1. **Model Flexibility**: Access to multiple LLM providers (OpenAI, Anthropic, etc.) through a single API
2. **Cost Optimization**: Ability to route requests to different models based on task complexity and budget
3. **Fallback Support**: Automatic failover to alternative models if primary models are unavailable

### Configuration

```typescript
// Example: Creating an LLM instance via OpenRouter
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  modelName: "openai/gpt-4-turbo", // OpenRouter format: "provider/model-name"
  temperature: 0.7,
  openAIApiKey: process.env.OPENROUTER_API_KEY, // Your OpenRouter API key
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://poiesis-parker.com", // Your site URL
      "X-Title": "Poiesis Parker Education Platform"
    }
  }
});
```

### Embedding Models

For vector embeddings, we use OpenRouter's embedding capabilities:

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";

const embeddings = new OpenAIEmbeddings({
  modelName: "openai/text-embedding-ada-002", // OpenRouter embedding model
  openAIApiKey: process.env.OPENROUTER_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1"
  }
});
```

## Memory Pipeline

The complete memory pipeline is coordinated in `createMemoryAugmentedChain` and works as follows:

1. User sends a message
2. Chat history is saved and retrieved
3. Standalone question is generated if needed
4. Semantic search retrieves relevant conversation memories
5. Student facts are pulled from structured storage
6. All memory types are combined in a prompt
7. LLM generates a response with full context
8. After response, background processes extract and store new facts

## Data Schemas

### Student Facts Schema
```typescript
interface StudentFact {
  id?: string;
  user_id: string;
  chat_id?: string | null;
  fact_type: 'preference' | 'struggle' | 'goal' | 'topic_interest' | 'learning_style' | 'other';
  subject?: string | null;
  details: string;
  confidence?: number | null;
  source_message_id?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}
```

### Vector Memory Schema
The vector memory uses Supabase's pgvector extension with:
- Text chunks with embeddings
- Metadata (user_id, chat_id, ingested_at)
- Match function for semantic similarity search

## Model Selection Strategy

With OpenRouter, we employ a tiered model selection strategy:

1. **Heavy Extraction Tasks** (SEL identification, fact extraction):
   - Primary: Claude 3 Opus or GPT-4
   - Fallback: Mixtral or Llama 3

2. **Context Processing** (RAG, memory retrieval):
   - Mid-tier models like Claude 3 Sonnet or GPT-3.5

3. **Simple Queries** (standalone question generation):
   - Lightweight models like Gemini Pro or Mistral

This strategy balances cost, performance, and reliability across different memory operations.

## Usage in Application

The memory system is used in:
- `/api/chat.ts` - Main chat API endpoint
- Integration with the frontend via chat interface
- Background processing of conversations 