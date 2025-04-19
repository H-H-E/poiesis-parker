// NOTE: This implementation uses the OpenAI compatibility of Mistral API
// rather than the AI SDK v4 Mistral provider directly due to type issues.
// When upgrading to the next version of AI SDK, this should be updated to
// use the native Mistral provider with streamText.
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import type { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import type { ServerRuntime } from "next"
import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import OpenAI from "openai"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.mistral_api_key, "Mistral")

    // Mistral is OpenAI-compatible, so we can use the OpenAI client
    const mistral = new OpenAI({
      apiKey: profile.mistral_api_key || "",
      baseURL: "https://api.mistral.ai/v1"
    })

    const response = await mistral.chat.completions.create({
      model: chatSettings.model,
      messages,
      temperature: chatSettings.temperature,
      max_tokens:
        CHAT_SETTING_LIMITS[chatSettings.model].MAX_TOKEN_OUTPUT_LENGTH,
      stream: true
    })

    // Convert the response into a friendly text-stream using AI SDK
    const stream = OpenAIStream(response)

    // Return streaming response
    return new StreamingTextResponse(stream)
  } catch (error: unknown) {
    let errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred"
    const errorCode =
      typeof error === "object" && error !== null && "status" in error
        ? (error as { status: number }).status
        : 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Mistral API Key not found. Please set it in your profile settings."
    } else if (errorCode === 401) {
      errorMessage =
        "Mistral API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
