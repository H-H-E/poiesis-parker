import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import type { ChatSettings } from "@/types"
import { streamText, type CoreMessage } from "ai"
import { mistral } from "@ai-sdk/mistral"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { countTokens, logTokenUsage } from "@/lib/token-usage"

export const runtime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, workspaceId, chatId } = json as {
    chatSettings: ChatSettings
    messages: Record<string, unknown>[]
    workspaceId?: string
    chatId?: string
  }

  try {
    const profile = await getServerProfile()
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        cookies: {
          get: name => {
            const cookie = cookieStore.get(name)
            return cookie?.value
          },
          set: (name, value, options) => {
            cookieStore.set(name, value, options)
            return
          },
          remove: (name, options) => {
            cookieStore.set(name, "", options)
            return
          }
        }
      }
    )

    checkApiKey(profile.mistral_api_key, "Mistral")

    // Count input tokens
    const messagesText = JSON.stringify(messages)
    const inputTokens = countTokens(messagesText)

    // Create Mistral API instance directly
    const mistralAPI = mistral({
      apiKey: profile.mistral_api_key || ""
    })

    // Get the language model for the specific model ID
    const model = mistralAPI.languageModel(chatSettings.model)

    // Format messages for Mistral AI SDK v4
    const formattedMessages: CoreMessage[] = messages.map(message => {
      const role = message.role as string
      const content =
        typeof message.content !== "string"
          ? JSON.stringify(message.content)
          : (message.content as string)

      // Convert to the format Mistral expects
      if (role === "user") {
        return { role: "user", content }
      }
      if (role === "assistant") {
        return { role: "assistant", content }
      }
      if (role === "system") {
        return { role: "system", content }
      }
      // Default to user if role is unrecognized
      return { role: "user", content }
    })

    // Use streamText from AI SDK v4
    const result = streamText({
      model,
      messages: formattedMessages,
      temperature: chatSettings.temperature,
      maxTokens:
        CHAT_SETTING_LIMITS[chatSettings.model]?.MAX_TOKEN_OUTPUT_LENGTH ||
        4096,
      onFinish: async completion => {
        // Count output tokens
        const outputTokens = countTokens(completion.text || "")

        // Get userId from profile
        const {
          data: { user }
        } = await supabase.auth.getUser()

        if (user) {
          // Log token usage
          await logTokenUsage(supabase, {
            userId: user.id,
            chatId: chatId,
            modelId: chatSettings.model,
            inputTokens,
            outputTokens,
            workspaceId
          })
        }
      }
    })

    // Use toDataStreamResponse directly
    return result.toDataStreamResponse()
  } catch (error: unknown) {
    console.error("Mistral API error:", error)
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred"
    const errorCode =
      typeof error === "object" && error !== null && "status" in error
        ? (error as { status: number }).status
        : 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      return new Response(
        JSON.stringify({
          message:
            "Mistral API Key not found. Please set it in your profile settings."
        }),
        { status: errorCode }
      )
    }

    if (errorCode === 401) {
      return new Response(
        JSON.stringify({
          message:
            "Mistral API Key is incorrect. Please fix it in your profile settings."
        }),
        { status: errorCode }
      )
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
