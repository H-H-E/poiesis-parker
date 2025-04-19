import { CHAT_SETTING_LIMITS } from "@/lib/chat-setting-limits"
import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatSettings } from "@/types"
import { getBase64FromDataURL, getMediaTypeFromDataURL } from "@/lib/utils"
import { StreamingTextResponse } from "ai"
import { streamText } from "ai"
import { createAnthropicProvider } from "@/lib/ai/providers"
import { CoreMessage } from "ai"

// export const runtime = "edge"

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages } = json as {
    chatSettings: ChatSettings
    messages: any[]
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.anthropic_api_key, "Anthropic")

    // Create Anthropic provider
    const anthropicProvider = createAnthropicProvider(
      profile.anthropic_api_key || ""
    )

    // Extract system message
    const systemMessage = messages[0].content

    // Format messages for AI SDK (handle images)
    const formattedMessages: CoreMessage[] = messages
      .slice(1)
      .map((message: any) => {
        // If content is not an array, return the message as is
        if (!Array.isArray(message?.content)) {
          return message
        }

        // Handle content array (potentially with images)
        return {
          ...message,
          content: message.content.map((content: any) => {
            if (
              content?.type === "image_url" &&
              (content?.image_url?.url as string).length
            ) {
              const image_url = content.image_url.url as string
              return {
                type: "image",
                image: {
                  type: "base64",
                  mimeType: getMediaTypeFromDataURL(image_url),
                  data: getBase64FromDataURL(image_url)
                }
              }
            } else {
              // Handle non-image content
              return content
            }
          })
        }
      })

    // Use streamText from AI SDK v4
    const result = streamText({
      model: anthropicProvider(chatSettings.model),
      messages: formattedMessages,
      temperature: chatSettings.temperature,
      system: systemMessage,
      maxTokens: CHAT_SETTING_LIMITS[chatSettings.model].MAX_TOKEN_OUTPUT_LENGTH
    })

    return new StreamingTextResponse(result.textStream)
  } catch (error: any) {
    let errorMessage = error.message || "An unexpected error occurred"
    const errorCode = error.status || 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "Anthropic API Key not found. Please set it in your profile settings."
    } else if (errorCode === 401) {
      errorMessage =
        "Anthropic API Key is incorrect. Please fix it in your profile settings."
    }

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
