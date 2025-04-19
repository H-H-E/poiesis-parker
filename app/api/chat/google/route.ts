import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import type { ChatSettings } from "@/types"
import { StreamingTextResponse, generateText } from "ai"
import type { CoreMessage } from "ai"
import type { ServerRuntime } from "next"
import { createGoogleProvider } from "@/lib/ai/providers"
import { getBase64FromDataURL, getMediaTypeFromDataURL } from "@/lib/utils"
import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"

interface GoogleMessagePart {
  type: string
  text?: string
  image_url?: { url: string }
}

interface GoogleChatMessage {
  role: "user" | "assistant"
  content: string | GoogleMessagePart[]
}

interface RequestBody {
  chatSettings: ChatSettings
  messages: GoogleChatMessage[]
}

export const runtime: ServerRuntime = "edge"

export async function POST(request: Request) {
  const { chatSettings, messages } = (await request.json()) as RequestBody

  try {
    const profile = await getServerProfile()
    checkApiKey(profile.google_gemini_api_key, "Google")

    const googleProvider = createGoogleProvider(
      profile.google_gemini_api_key || ""
    )

    // Convert to CoreMessage[]
    const formattedMessages: CoreMessage[] = messages.map(msg => {
      const role = msg.role === "assistant" ? "assistant" : "user"
      if (typeof msg.content === "string") {
        return { role, content: msg.content }
      }
      const parts = msg.content.map(part =>
        part.type === "image_url" && part.image_url?.url
          ? {
              type: "image",
              image: {
                type: "base64",
                mimeType: getMediaTypeFromDataURL(part.image_url.url),
                data: getBase64FromDataURL(part.image_url.url)
              }
            }
          : { type: "text", text: part.text ?? "" }
      )
      return { role, content: parts }
    })

    const { textStream } = await generateText({
      model: googleProvider(chatSettings.model),
      messages: formattedMessages,
      temperature: chatSettings.temperature,
      maxTokens:
        CHAT_SETTING_LIMITS[chatSettings.model].MAX_TOKEN_OUTPUT_LENGTH,
      stream: true
    })

    return new StreamingTextResponse(textStream)
  } catch (err: unknown) {
    console.error("Google chat error:", err)
    const error = err instanceof Error ? err : new Error(String(err))
    const status = (error as { status?: number }).status || 500
    let message = error.message
    const lower = message.toLowerCase()
    if (lower.includes("api key not found")) {
      message =
        "Google Gemini API Key not found. Please set it in your profile settings."
    } else if (lower.includes("invalid api key")) {
      message =
        "Google Gemini API Key is incorrect. Please fix it in your profile settings."
    }
    return new Response(JSON.stringify({ message }), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  }
}
