# AI SDK v4 Upgrade Notes

## Overview

This document explains the approach taken for upgrading to Vercel AI SDK v4 and the key design decisions made during the migration.

## Approach

We've chosen a **hub-and-spoke model** for the chat API endpoints:

1. The main route (`app/api/chat/route.ts`) acts as a **central dispatcher**:
   - It handles common functionality (workspace fetching, message building)
   - It determines the appropriate provider based on the model ID
   - It forwards requests to provider-specific routes

2. Provider-specific routes handle specialized formatting:
   - `app/api/chat/openai/route.ts`: Uses `generateText()` with OpenAI provider
   - `app/api/chat/anthropic/route.ts`: Uses `streamText()` with Anthropic provider
   - `app/api/chat/mistral/route.ts`: Uses `streamText()` with Mistral provider
   - Additional provider routes handle other model types

## Why This Design?

1. **Type Safety**
   - The AI SDK v4 has strict typing requirements that differ by provider
   - Message formats (especially for multi-modal content) vary between providers
   - Specialized routes allow proper typing without complex conditionals

2. **Maintainability**
   - Changes to a specific provider only require updates to its dedicated route
   - New providers can be added without modifying existing provider code

3. **Progressive Migration**
   - Allows us to migrate one provider at a time
   - Working implementations remain stable while more complex providers are updated

4. **Performance**
   - Provider-specific formatting is isolated to its own route
   - Each route can be optimized for its particular provider

## Implementation Details

### Central Router Logic

The central dispatcher (`app/api/chat/route.ts`) follows this flow:
1. Receive request and extract parameters
2. Build final messages using existing message building logic
3. Determine the appropriate provider route based on model ID
4. Forward the request to that route
5. Stream response back to the client

### Provider Route Logic

Each provider route follows a consistent pattern:
1. Extract messages and settings from the forwarded request
2. Get API keys from the user profile
3. Create the provider with the appropriate API key
4. Format messages for the specific provider requirements
5. Use `streamText()` or `generateText()` to generate the response
6. Log token usage on completion
7. Return a streaming response

## Known Limitations

1. **Type Definition Issues**
   - Some persistent TypeScript errors in the AI SDK v4 definitions
   - We've added workarounds where necessary, with detailed comments

2. **Google Gemini Compatibility**
   - The Google route currently uses the native Gemini SDK due to type compatibility issues
   - We'll revisit this integration when the AI SDK provides better support

3. **StreamingTextResponse Import Problems**
   - The import `import { StreamingTextResponse } from 'ai'` leads to runtime errors
   - Neither `import { StreamingTextResponse } from 'ai/rsc'` resolves the error
   - **Workaround**: Use `result.toDataStreamResponse()` directly instead of creating a new `StreamingTextResponse` instance
   - Example:
     ```typescript
     // ❌ This doesn't work reliably
     return new StreamingTextResponse(result.textStream)
     
     // ✅ Use this pattern instead
     return result.toDataStreamResponse()
     ```

4. **Provider Call Signature Issues**
   - TypeScript shows errors like `This expression is not callable. Type 'LanguageModelV1' has no call signatures.`
   - These are false positives - the code works at runtime despite these type errors
   - We've utilized a two-step approach to improve readability:
     ```typescript
     // Store the provider in a variable first
     const provider = mistralProvider(modelId);
     
     // Then use it in the streamText call
     const result = streamText({
       model: provider,
       // other options...
     });
     ```

## Next Steps

1. Complete migration of all provider routes
2. Add comprehensive testing across providers
3. Optimize token counting and logging
4. Revisit Google integration when AI SDK v4 updates are available

## For Developers

If you're adding a new model or provider:

1. Update the main router to detect your model prefix
2. Create a provider-specific route following the existing patterns
3. Add the provider to the `lib/ai/providers.ts` file
4. Update any relevant documentation

We recommend reviewing the existing provider implementations as examples, particularly:
- OpenAI for text-based models
- Anthropic for multi-modal models

### Dealing with TypeScript Errors

When implementing a new provider route, you may encounter TypeScript errors despite functional code. Common issues include:

1. **Message Formatting**:
   ```typescript
   // Be explicit with types when mapping messages
   const formattedMessages = messages.map(message => ({
     role: message.role as "user" | "assistant" | "system",
     content: typeof message.content === "string" 
       ? message.content 
       : JSON.stringify(message.content)
   }));
   ```

2. **Provider Invocation**:
   ```typescript
   // Store provider in variable to avoid complex type errors
   const provider = createMyProvider(apiKey);
   const modelWithProvider = provider(modelId);
   
   const result = streamText({
     model: modelWithProvider,
     // other options...
   });
   ```

3. **Response Handling**:
   ```typescript
   // Use toDataStreamResponse instead of StreamingTextResponse
   return result.toDataStreamResponse();
   ``` 