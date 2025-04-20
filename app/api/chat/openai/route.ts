import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import type { ChatSettings } from "@/types"
import type { ServerRuntime } from "next"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { countTokens, logTokenUsage } from "@/lib/token-usage"
import type { SupabaseClient } from "@supabase/supabase-js"
import { streamText, type CoreMessage } from "ai"
import { openai } from "@ai-sdk/openai"

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, workspaceId, chatId } = json as {
    chatSettings: ChatSettings
    messages: ChatCompletionMessageParam[]
    workspaceId?: string
    chatId?: string
  }

  try {
    // Initialize Supabase client for token logging
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
    ) as SupabaseClient

    const profile = await getServerProfile()

    checkApiKey(profile.openai_api_key, "OpenAI")

    // Count input tokens
    const messagesText = JSON.stringify(messages)
    const inputTokens = countTokens(messagesText)

    // Format messages for AI SDK v4
    const formattedMessages: CoreMessage[] = messages.map(message => {
      const role = message.role as string
      let content: string

      if (typeof message.content === "string") {
        content = message.content
      } else if (Array.isArray(message.content)) {
        content = JSON.stringify(message.content)
      } else {
        content = String(message.content || "")
      }

      if (role === "user") {
        return { role: "user", content }
      }
      if (role === "assistant") {
        return { role: "assistant", content }
      }
      if (role === "system") {
        return { role: "system", content }
      }

      // Default to user for unknown roles
      return { role: "user", content }
    })

    // Create OpenAI model with the provider
    const openaiProvider = openai({
      apiKey: profile.openai_api_key || ""
    })

    // Use streamText from AI SDK v4 with the model
    const result = await streamText({
      model: openaiProvider(chatSettings.model),
      messages: formattedMessages,
      temperature: chatSettings.temperature,
      maxTokens: 4096,
      onFinish: async completion => {
        // Count output tokens
        const outputTokens = countTokens(completion.text)

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

    // Return streaming response using toDataStreamResponse() helper
    return result.toDataStreamResponse()
  } catch (error: unknown) {
    let errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred"
    const errorCode =
      typeof error === "object" && error !== null && "status" in error
        ? (error as { status: number }).status
        : 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenAI API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("incorrect api key")) {
      errorMessage =
        "OpenAI API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
