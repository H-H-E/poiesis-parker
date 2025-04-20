# Vercel AI SDK v4 Upgrade

This document tracks the implementation plan and progress for upgrading our application to use the latest Vercel AI SDK v4.

## Completed Tasks

- [x] Upgrade dependencies in package.json
- [x] Install new dependencies
- [x] Create basic implementation for Mistral provider

## In Progress Tasks

- [ ] Update OpenAI provider implementation with AI SDK v4
  - [ ] Fix TypeScript typing issues with OpenAI provider
  - [ ] Test OpenAI implementation
- [ ] Update other providers to use AI SDK v4 patterns
  - [ ] Anthropic
  - [ ] Google
  - [ ] Perplexity
  - [ ] Groq
  - [ ] Azure OpenAI

## Future Tasks

- [ ] Optimize message formatting for different providers
- [ ] Add proper error handling for all providers
- [ ] Update client-side hooks if needed
- [ ] Implement tools and function calling with new API
- [ ] Add comprehensive testing for all providers
- [ ] Update documentation with new implementation details

## Implementation Plan

We are following a hub-and-spoke model for the chat API endpoints:

1. The main route (`app/api/chat/route.ts`) acts as a central dispatcher that forwards requests to provider-specific routes.
2. Each provider has its own specialized route that handles API key management, message formatting, and token usage tracking.
3. Provider-specific routes use the AI SDK v4 Core functions like `streamText()` or `generateText()`.

### Relevant Files

- `package.json` - Updated with AI SDK v4 dependencies ✅
- `app/api/chat/mistral/route.ts` - Updated to use streamText() ✅ 
- `app/api/chat/openai/route.ts` - Currently updating
- `app/api/chat/anthropic/route.ts` - Needs to be updated
- `app/api/chat/google/route.ts` - Needs to be updated
- `app/api/chat/perplexity/route.ts` - Needs to be updated
- `app/api/chat/groq/route.ts` - Needs to be updated
- `app/api/chat/azure/route.ts` - Needs to be updated

## Known Issues

1. **TypeScript Typing Issues**
   - AI SDK v4 has some strict typing requirements that may show errors despite working code
   - Provider initialization and model calling patterns need to be followed carefully

2. **Response Handling**
   - Using `result.toDataStreamResponse()` instead of creating a new `StreamingTextResponse` instance

3. **Provider Differences**
   - Each provider has slightly different message formatting requirements 