# Vercel AI SDK v4 Migration

This document outlines the migration process from Vercel AI SDK v2 to v4.

## What Changed

1. **Package Updates**:
   - Updated from `ai@2.2.31` to `ai@4.2.2`
   - Added provider-specific packages:
     - `@ai-sdk/openai`
     - `@ai-sdk/anthropic`
     - `@ai-sdk/google`
     - `@ai-sdk/mistral`
     - `@ai-sdk/azure-openai`

2. **API Structure Changes**:
   - Removed class-based providers (OpenAI, Anthropic) in favor of function-based providers
   - Replaced `OpenAIStream`, `AnthropicStream` with `streamText` from the core SDK
   - Updated streaming response handling
   - Updated type definitions

## Key Architecture Changes

### Provider Organization

Created a new provider configuration file at `lib/ai/providers.ts` that:
- Centralizes provider creation logic
- Provides helper functions for each model provider
- Includes a utility to automatically select the right provider based on model ID

### API Route Updates

Updated all API routes to use the new v4 patterns:
- Using the new provider pattern
- Using `streamText` instead of provider-specific streams
- Adapting message formats to the new standard

## Completed Tasks

1. **Provider Setup**:
   - Added provider-specific packages
   - Created a centralized provider configuration file
   - Implemented helper functions for each provider
   - Added a utility to select the appropriate provider based on model ID

2. **API Route Migration**:
   - Updated OpenAI route to use `generateText` with streaming
   - Updated Anthropic route to use `streamText`
   - Updated Google route to use `streamText`
   - Adapted Mistral route with compatibility mode (temporary solution)

## Outstanding Tasks

1. **Complete API Route Migration**:
   - Update remaining API routes (groq, perplexity, etc.) to use v4 patterns
   - Fix all type issues with `streamText` imports

2. **Client Component Updates**:
   - Update any client components that directly use AI SDK hooks

3. **Testing and Validation**:
   - Test all migrated routes with different models
   - Verify streaming works correctly
   - Test error handling scenarios
   - Check token usage tracking

## Benefits of Vercel AI SDK v4

1. **Unified API**: Common interface for all AI providers
2. **Better Type Safety**: Improved TypeScript definitions
3. **Enhanced Features**:
   - Improved streaming capabilities
   - Better tool calling support
   - More consistent error handling

## Known Issues

1. **Mistral Provider**:
   - The Mistral route currently uses the OpenAI compatibility mode due to type issues with the AI SDK v4 Mistral provider
   - This should be updated to use the native Mistral provider with `streamText` in a future update

2. **Type Definitions**:
   - There are some TypeScript errors related to the AI SDK v4 imports
   - These will be addressed in future updates

## How to Test the Migration

1. Test each API route with different models
2. Verify streaming works correctly
3. Test error handling scenarios
4. Check token usage tracking 