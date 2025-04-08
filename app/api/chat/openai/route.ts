import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import type { ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import type { ServerRuntime } from "next"
import OpenAI from "openai"
import type {
  ChatCompletionCreateParamsBase,
  ChatCompletionMessageParam
} from "openai/resources/chat/completions.mjs"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { countTokens, logTokenUsage } from "@/lib/token-usage"
import type { SupabaseClient } from "@supabase/supabase-js"

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
    const profile = await getServerProfile()
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        cookies: {
          get: name => cookieStore.get(name)?.value,
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

    checkApiKey(profile.openai_api_key, "OpenAI")

    // Fetch global student system prompt
    let globalSettings = null
    try {
      const { data } = await supabase
        .from("global_settings")
        .select("student_system_prompt")
        .limit(1)
        .single()
      globalSettings = data
    } catch {
      globalSettings = null
    }

    // Check if the first message is a system message and append the global student prompt if needed
    if (
      messages.length > 0 &&
      messages[0].role === "system" &&
      globalSettings?.student_system_prompt
    ) {
      const systemMessage = messages[0]
      if (
        !systemMessage.content.includes(
          "Student Instructions (Apply to all student interactions):"
        )
      ) {
        // Add global student prompt after admin instructions but before other content
        const contentParts = systemMessage.content.split(
          "Admin Instructions (Always Follow These First):"
        )
        if (contentParts.length > 1) {
          // Insert after admin instructions
          const [beforeAdmin, afterAdmin] = contentParts
          const adminParts = afterAdmin.split("\n\n")
          systemMessage.content = `${beforeAdmin}Admin Instructions (Always Follow These First):${adminParts[0]}\n\nStudent Instructions (Apply to all student interactions):\n${globalSettings.student_system_prompt}\n\n${adminParts.slice(1).join("\n\n")}`
        } else {
          // No admin instructions, add after today's date
          const dateParts = systemMessage.content.split("Today is")
          if (dateParts.length > 1) {
            const [beforeDate, afterDate] = dateParts
            const dateContent = afterDate.split("\n\n")
            systemMessage.content = `${beforeDate}Today is${dateContent[0]}\n\nStudent Instructions (Apply to all student interactions):\n${globalSettings.student_system_prompt}\n\n${dateContent.slice(1).join("\n\n")}`
          } else {
            // Fallback: Add to the beginning
            systemMessage.content = `Student Instructions (Apply to all student interactions):\n${globalSettings.student_system_prompt}\n\n${systemMessage.content}`
          }
        }
      }
    }

    // Count input tokens
    const messagesText = JSON.stringify(messages)
    const inputTokens = countTokens(messagesText)

    const openai = new OpenAI({
      apiKey: profile.openai_api_key || "",
      organization: profile.openai_organization_id
    })

    const response = await openai.chat.completions.create({
      model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
      messages: messages as ChatCompletionCreateParamsBase["messages"],
      temperature: chatSettings.temperature,
      max_tokens: 4096,
      stream: true
    })

    // Create a function to handle the stream and track tokens
    const streamWithTokenTracking = OpenAIStream(response, {
      async onFinal(completion) {
        // Count output tokens
        const outputTokens = countTokens(completion)

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

    return new StreamingTextResponse(streamWithTokenTracking)
  } catch (error: unknown) {
    let errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred"
    const errorCode =
      typeof error === "object" && error !== null && "status" in error
        ? ((error as any).status as number)
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
