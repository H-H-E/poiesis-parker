# Vercel AI SDK Integration Guide

## Table of Contents

- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Basic Configuration](#basic-configuration)
- [Mem0 Integration](#mem0-integration)
  - [Overview](#overview)
  - [Setup](#setup)
  - [Memory Features](#memory-features)
  - [Usage Examples](#usage-examples)
- [Advanced Features](#advanced-features)
  - [Guardrails](#guardrails)
  - [Conditional Routing](#conditional-routing)
  - [Fallback Strategies](#fallback-strategies)
  - [Caching](#caching)
- [Production Best Practices](#production-best-practices)
- [Monitoring and Observability](#monitoring-and-observability)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

## Introduction

The Vercel AI SDK provides a powerful framework for building AI-powered applications with streaming-first capabilities. This guide outlines best practices for integrating and implementing the Vercel AI SDK in production environments, focusing on reliability, performance, and scalability.

## Prerequisites

Before integrating the Vercel AI SDK, ensure you have:

- Node.js (v18 or later) installed
- A Vercel project set up (Next.js, Svelte, or other supported frameworks)
- API keys for your preferred AI providers (OpenAI, Anthropic, etc.)
- Basic familiarity with streaming interfaces and AI concepts

## Installation

Install the Vercel AI SDK in your project:

```bash
# For Next.js projects
npm install ai

# For provider-specific functionality
npm install @ai-sdk/openai    # For OpenAI
npm install @ai-sdk/anthropic # For Anthropic
# Other providers as needed
```

## Basic Configuration

### Setting up with Next.js App Router

Create an API route that utilizes the Vercel AI SDK:

```typescript
// app/api/chat/route.ts
import { StreamingTextResponse, LangChainStream } from 'ai';
import { ChatOpenAI } from '@langchain/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.7,
    streaming: true,
  });

  const { stream, handlers } = LangChainStream();
  
  llm.call(messages, {}, [handlers]).catch(console.error);
  
  return new StreamingTextResponse(stream);
}
```

### Client-Side Implementation

```typescript
// app/page.tsx
'use client';

import { useChat } from 'ai/react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div>
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className={message.role}>
            {message.content}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Say something..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

## Mem0 Integration

### Overview

The Mem0 AI SDK Provider enhances the Vercel AI SDK by adding persistent memory capabilities to your AI applications. This enables your language models to maintain context across conversations and provide more personalized, contextually relevant responses.

Key features:
- 🧠 Persistent memory storage for conversational AI
- 🔄 Seamless integration with Vercel AI SDK
- 🚀 Support for multiple LLM providers
- 📝 Rich message format support
- ⚡ Streaming capabilities
- 🛠️ Tools call support

### Setup

1. Install the Mem0 Provider:

```bash
npm install @mem0/vercel-ai-provider
```

2. Initialize the Mem0 Client:

```typescript
import { createMem0 } from "@mem0/vercel-ai-provider";

const mem0 = createMem0({
  provider: "openai",
  mem0ApiKey: "m0-xxx", // Your Mem0 API key
  apiKey: "provider-api-key", // Your LLM provider API key
  config: {
    compatibility: "strict",
  },
  // Optional Mem0 Global Config
  mem0Config: {
    user_id: "user-123",
    org_id: "org-456",
    project_id: "project-789",
  },
});
```

> **Note**: It's best practice to store API keys in environment variables (e.g., `MEM0_API_KEY` and `OPENAI_API_KEY`).

### Memory Features

Mem0 provides several functions for managing memory:

1. **Add Memories** - Store user interactions for future context:

```typescript
import { LanguageModelV1Prompt } from "ai";
import { addMemories } from "@mem0/vercel-ai-provider";

const messages: LanguageModelV1Prompt = [
  { role: "user", content: [{ type: "text", text: "I prefer electric vehicles." }] },
];

await addMemories(messages, { user_id: "user-123" });
```

2. **Retrieve Memories** - Get context-relevant memories as a formatted system prompt:

```typescript
import { retrieveMemories } from "@mem0/vercel-ai-provider";

const prompt = "What type of car should I buy?";
const memories = await retrieveMemories(prompt, { user_id: "user-123" });
```

3. **Get Raw Memories** - Retrieve memories in array format for custom processing:

```typescript
import { getMemories } from "@mem0/vercel-ai-provider";

const prompt = "What type of car should I buy?";
const rawMemories = await getMemories(prompt, { user_id: "user-123" });
```

### Usage Examples

#### 1. Basic Text Generation with Memory

```typescript
import { generateText } from "ai";
import { createMem0 } from "@mem0/vercel-ai-provider";

const mem0 = createMem0();

const { text } = await generateText({
  model: mem0("gpt-4o", { user_id: "user-123" }),
  prompt: "What car should I buy based on my preferences?",
});
```

#### 2. Combining OpenAI with Memory Utilities

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { retrieveMemories } from "@mem0/vercel-ai-provider";

const prompt = "What car should I buy?";
const memories = await retrieveMemories(prompt, { user_id: "user-123" });

const { text } = await generateText({
  model: openai("gpt-4o"),
  prompt: prompt,
  system: memories, // Use retrieved memories as system context
});
```

#### 3. Streaming Responses with Memory

```typescript
import { streamText } from "ai";
import { createMem0 } from "@mem0/vercel-ai-provider";

const mem0 = createMem0();

const { textStream } = await streamText({
  model: mem0("gpt-4o", { user_id: "user-123" }),
  prompt: "Recommend a car based on my past preferences.",
});

// Process the stream
for await (const textPart of textStream) {
  process.stdout.write(textPart);
}
```

#### 4. Using Tools with Memory Context

```typescript
import { generateText } from "ai";
import { createMem0 } from "@mem0/vercel-ai-provider";
import { tool } from "ai";
import { z } from "zod";

const mem0 = createMem0({
  provider: "anthropic",
  apiKey: "anthropic-api-key",
  mem0Config: {
    user_id: "user-123"
  }
});

const result = await generateText({
  model: mem0('claude-3-5-sonnet'),
  tools: {
    getWeather: tool({
      description: 'Get the weather in a location',
      parameters: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
        conditions: "sunny",
      }),
    }),
  },
  prompt: "What's the weather like in my city?",
});

console.log(result.text);
```

#### 5. Retrieving Memory Sources

```typescript
const { text, sources } = await generateText({
  model: mem0("gpt-4o"),
  prompt: "Suggest a car based on what you know about me.",
});

console.log("AI Response:", text);
console.log("Memory Sources:", sources);
```

## Advanced Features

### Guardrails

Implement guardrails to ensure safe and appropriate AI responses:

```typescript
import { createGuardrail } from '@portkey-ai/vercel-provider';

const guardrail = createGuardrail({
  beforeRequest: (request) => {
    // Validate input, block harmful content
    if (containsSensitiveData(request.messages)) {
      throw new Error('Contains sensitive information');
    }
    return request;
  },
  afterResponse: (response) => {
    // Sanitize output
    return sanitizeResponse(response);
  }
});

// Use with AI model
const result = await generateText({
  model: model,
  prompt: prompt,
  guardrail: guardrail
});
```

### Conditional Routing

Route requests to different models based on specific conditions:

```typescript
const routingConfig = {
  strategy: {
    mode: "conditional",
    conditions: [
      {
        query: { "metadata.user_plan": { "$eq": "premium" } },
        then: "gpt-4o"
      },
      {
        query: { "metadata.user_plan": { "$eq": "basic" } },
        then: "gpt-3.5-turbo"
      }
    ],
    default: "gpt-3.5-turbo"
  }
};
```

### Fallback Strategies

Implement fallback mechanisms for resilience:

```typescript
const fallbackConfig = {
  strategy: {
    mode: "fallback"
  },
  targets: [
    {
      provider: "anthropic",
      model: "claude-3-5-sonnet"
    },
    {
      provider: "openai",
      model: "gpt-4o"
    }
  ]
};
```

### Caching

Optimize performance and reduce costs with caching:

```typescript
const cacheConfig = {
  cache: {
    mode: "semantic", // or "simple"
    ttl: 3600, // Time to live in seconds
  }
};
```

## Production Best Practices

1. **API Key Management**
   - Store API keys in environment variables
   - Use virtual keys for improved security and management
   - Implement key rotation policies

2. **Error Handling**
   - Implement robust error boundaries
   - Add retry mechanisms for transient failures
   - Provide graceful fallbacks for service disruptions

3. **Rate Limiting**
   - Respect provider rate limits
   - Implement client-side throttling
   - Queue requests during high demand

4. **Cost Management**
   - Monitor token usage
   - Implement budget alerts
   - Optimize prompt design to reduce tokens

5. **Performance Optimization**
   - Use streaming for responsive UIs
   - Implement caching for common queries
   - Optimize model selection based on needs

6. **Memory Management (Mem0-specific)**
   - Use unique user IDs for consistent memory retrieval
   - Regularly clean up unused memory data
   - Consider using `agent_id`, `app_id`, and `run_id` for better organization

## Monitoring and Observability

Implement comprehensive monitoring:

```typescript
// Add metadata for tracking
const result = await generateText({
  model: model,
  prompt: prompt,
  metadata: {
    userId: 'user-123',
    sessionId: 'session-456',
    requestType: 'customer-support'
  }
});
```

Track key metrics:
- Response times
- Token usage and costs
- Error rates
- Request volumes
- Memory usage and retrieval effectiveness

## Examples

### RAG (Retrieval Augmented Generation) Implementation

```typescript
import { StreamingTextResponse } from 'ai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const { messages, query } = await req.json();
  
  // Connect to vector database
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  
  // Perform vector search
  const { data: documents } = await supabase
    .rpc('match_documents', { query_embedding: await getEmbedding(query), match_count: 3 });
  
  // Augment prompt with retrieved content
  const augmentedMessages = [
    ...messages,
    { role: 'system', content: `Use this information: ${documents.map(d => d.content).join('\n')}` }
  ];
  
  // Generate response with augmented context
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: augmentedMessages,
    stream: true
  });
  
  return new StreamingTextResponse(response.body);
}
```

### Multi-Modal Chat Implementation

```typescript
import { StreamingTextResponse } from 'ai';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(req: Request) {
  const formData = await req.formData();
  const messages = JSON.parse(formData.get('messages') as string);
  const image = formData.get('image') as File;
  
  // Create multi-modal messages array
  const multiModalMessages = [
    ...messages,
  ];
  
  // Add image if present
  if (image) {
    const imageBytes = await image.arrayBuffer();
    const base64Image = Buffer.from(imageBytes).toString('base64');
    
    multiModalMessages.push({
      role: 'user',
      content: [
        { type: 'text', text: 'What can you tell me about this image?' },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
      ]
    });
  }
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: multiModalMessages,
    stream: true
  });
  
  return new StreamingTextResponse(response.body);
}
```

## Troubleshooting

Common issues and solutions:

1. **Streaming not working**
   - Ensure `streaming: true` is set
   - Check that you're using `StreamingTextResponse`
   - Verify client supports streaming

2. **Rate limit errors**
   - Implement exponential backoff
   - Add request throttling
   - Use multiple API keys for load balancing

3. **High latency**
   - Use smaller, faster models for non-critical tasks
   - Implement caching
   - Consider regional deployments

4. **Memory issues**
   - Limit context window size
   - Implement chunking for large documents
   - Use streaming to reduce memory pressure

5. **Mem0-specific issues**
   - Ensure user_id is consistently used across requests
   - Verify API keys are properly configured
   - Check Mem0 dashboard for memory status and usage

## Resources

- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Mem0 AI SDK Provider Documentation](https://docs.mem0.ai/integrations/vercel-ai-sdk)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview) 