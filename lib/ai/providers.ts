import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import { google } from "@ai-sdk/google"
import { mistral } from "@ai-sdk/mistral"
import type { LLMID } from "@/types"

/**
 * Create OpenAI provider with API key
 */
export function createOpenAIProvider(apiKey: string, organizationId?: string) {
  return openai({
    apiKey,
    organization: organizationId
  })
}

/**
 * Create Anthropic provider with API key
 */
export function createAnthropicProvider(apiKey: string) {
  return anthropic({
    apiKey
  })
}

/**
 * Create Google provider with API key
 */
export function createGoogleProvider(apiKey: string) {
  return google({
    apiKey
  })
}

/**
 * Create Mistral provider with API key
 */
export function createMistralProvider(apiKey: string) {
  return mistral({
    apiKey
  })
}

/**
 * Get the appropriate provider based on model ID
 */
export function getProviderForModel(
  modelId: LLMID,
  openaiKey?: string,
  openaiOrg?: string,
  anthropicKey?: string,
  googleKey?: string,
  mistralKey?: string
) {
  if (modelId.startsWith("gpt-") || modelId.includes("openai")) {
    if (!openaiKey) throw new Error("OpenAI API key not found")
    return createOpenAIProvider(openaiKey, openaiOrg)
  }

  if (modelId.startsWith("claude-")) {
    if (!anthropicKey) throw new Error("Anthropic API key not found")
    return createAnthropicProvider(anthropicKey)
  }

  if (modelId.startsWith("gemini-")) {
    if (!googleKey) throw new Error("Google API key not found")
    return createGoogleProvider(googleKey)
  }

  if (modelId.startsWith("mistral-")) {
    if (!mistralKey) throw new Error("Mistral API key not found")
    return createMistralProvider(mistralKey)
  }

  throw new Error(`No provider found for model: ${modelId}`)
}
