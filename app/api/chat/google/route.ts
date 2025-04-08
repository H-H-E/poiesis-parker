import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import type { ChatSettings } from "@/types"
import { GoogleGenAI } from "@google/genai"

export const runtime = "edge"

// Define our own message types based on what we're actually using
interface ChatMessageContent {
  type: string
  text?: string
  image_url?: {
    url: string
  }
}

interface ChatMessage {
  role: string
  content: string | ChatMessageContent[]
}

interface RequestBody {
  chatSettings: ChatSettings
  messages: ChatMessage[]
}

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as RequestBody

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.google_gemini_api_key, "Google")

    // Initialize with the correct format - apiKey is a string property in the options object
    const ai = new GoogleGenAI({ apiKey: profile.google_gemini_api_key || "" })

    if (!Array.isArray(messages)) {
      throw new Error("Expected messages to be an array")
    }

    // Convert messages to the format expected by the Google API
    const contents = messages.flatMap(msg => {
      if (!msg.content) throw new Error("Expected content to be defined")
      if (!msg.role) throw new Error("Expected role to be defined")

      const role = msg.role === "assistant" ? "model" : "user"

      if (Array.isArray(msg.content)) {
        const parts = msg.content.map(contentPart => {
          if (contentPart.type === "text") {
            return { text: contentPart.text }
          } else if (contentPart.type === "image_url") {
            if (!contentPart.image_url?.url) {
              throw new Error("Expected image_url.url to be defined")
            }
            const url = contentPart.image_url.url
            const mimeTypeMatch = url.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)
            if (!mimeTypeMatch) {
              throw new Error("Could not determine mime type from image URL")
            }
            const mimeType = mimeTypeMatch[0]
            const data = url
              .replace(/^data:image\/\w+;base64,/, "")
              .replace(/"/g, "")
            return {
              inlineData: { data, mimeType }
            }
          }
          throw new Error(`Unsupported content part type: ${contentPart.type}`)
        })
        return { role, parts }
      }

      // Handle string content
      return { role, parts: [{ text: msg.content }] }
    })

    if (contents.length === 0) {
      throw new Error("Expected at least one message")
    }

    // Generate content stream with the correct parameters format for v0.7.0
    const streamResult = await ai.models.generateContentStream({
      model: chatSettings.model,
      contents: contents,
      // Use the recommended structure according to official documentation
      config: {
        temperature: chatSettings.temperature
      }
    })

    // Stream is the AsyncGenerator itself in the new API
    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text))
            }
          }
          controller.close()
        } catch (error) {
          console.error("Error processing stream:", error)
          controller.error(error)
        }
      }
    })

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain" }
    })
  } catch (error: unknown) {
    console.error("Error occurred:", error)

    let errorMessage = "An unexpected error occurred"
    let errorCode = 500

    if (error instanceof Error) {
      errorMessage = error.message
    }

    if (typeof error === "object" && error !== null && "status" in error) {
      const status = (error as { status: unknown }).status
      if (typeof status === "number") {
        errorCode = status
      }
    }

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Google Gemini API Key not found. Please set it in your profile settings."
    } else if (
      errorMessage.toLowerCase().includes("api key not valid") ||
      errorMessage.toLowerCase().includes("invalid api key")
    ) {
      errorMessage =
        "Google Gemini API Key is incorrect. Please fix it in your profile settings."
    } else if (errorCode === 404) {
      errorMessage = `Model not found or API endpoint issue. Please check the model name and API configuration. Original error: ${errorMessage}`
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode,
      headers: { "Content-Type": "application/json" }
    })
  }
}
