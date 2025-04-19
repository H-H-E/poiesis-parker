import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import type { ChatSettings } from "@/types"
import { StreamingTextResponse, generateText } from "ai"
import type { ServerRuntime } from "next"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { countTokens, logTokenUsage } from "@/lib/token-usage"
import { createOpenAIProvider } from "@/lib/ai/providers"

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

    // Process messages - ensure system message content is a string
    const processedMessages = messages.map(msg => {
      if (msg.role === "system" && typeof msg.content !== "string") {
        return { ...msg, content: "System instructions" } // Fallback if not string
      }
      return msg
    })

    // Check if the first message is a system message and append the global student prompt if needed
    if (
      processedMessages.length > 0 &&
      processedMessages[0].role === "system" &&
      typeof processedMessages[0].content === "string" &&
      globalSettings?.student_system_prompt
    ) {
      const systemMessage = processedMessages[0]
      const systemContent = systemMessage.content as string

      if (
        !systemContent.includes(
          "Student Instructions (Apply to all student interactions):"
        )
      ) {
        // Add global student prompt after admin instructions but before other content
        const contentParts = systemContent.split(
          "Admin Instructions (Always Follow These First):"
        )
        if (contentParts.length > 1) {
          // Insert after admin instructions
          const [beforeAdmin, afterAdmin] = contentParts
          const adminParts = afterAdmin.split("\n\n")
          systemMessage.content = `${beforeAdmin}Admin Instructions (Always Follow These First):${adminParts[0]}\n\nStudent Instructions (Apply to all student interactions):\n${globalSettings.student_system_prompt}\n\n${adminParts.slice(1).join("\n\n")}`
        } else {
          // No admin instructions, add after today's date
          const dateParts = systemContent.split("Today is")
          if (dateParts.length > 1) {
            const [beforeDate, afterDate] = dateParts
            const dateContent = afterDate.split("\n\n")
            systemMessage.content = `${beforeDate}Today is${dateContent[0]}\n\nStudent Instructions (Apply to all student interactions):\n${globalSettings.student_system_prompt}\n\n${dateContent.slice(1).join("\n\n")}`
          } else {
            // Fallback: Add to the beginning
            systemMessage.content = `Student Instructions (Apply to all student interactions):\n${globalSettings.student_system_prompt}\n\n${systemContent}`
          }
        }
      }
    }

    // Count input tokens
    const messagesText = JSON.stringify(processedMessages)
    const inputTokens = countTokens(messagesText)

    // Create OpenAI provider with API key
    const openaiProvider = createOpenAIProvider(
      profile.openai_api_key || "",
      profile.openai_organization_id || undefined
    )

    // Use the new generateText function from AI SDK v4 (non-streaming)
    const { textStream } = await generateText({
      model: openaiProvider(chatSettings.model),
      messages: processedMessages,
      temperature: chatSettings.temperature,
      maxTokens: 4096,
      stream: true,
      onFinish: async completion => {
        // Count output tokens
        const outputTokens = countTokens(completion.content)

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

    // Return streaming response
    return new StreamingTextResponse(textStream)
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
