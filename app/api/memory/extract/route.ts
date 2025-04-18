import { processAndStoreConversationFacts } from "@/lib/memory/fact-management"
import { createClient } from "@/lib/supabase/server-client" // Use server client for security
import { NextResponse } from "next/server"
import type { BaseMessage } from "@langchain/core/messages"

// Define expected structure for incoming messages
type SimpleMessage = { role: string; content: string }

// Define the expected request body structure
interface ExtractRequestBody {
  userId: string
  chatId?: string
  messages: SimpleMessage[]
  modelName?: string
}

/**
 * API Route: POST /api/memory/extract
 *
 * Endpoint to trigger the asynchronous extraction and storage of structured facts
 * from a chat conversation using a Gemini model.
 *
 * Request Body: ExtractRequestBody
 *
 * Responses:
 *  - 200 OK: { message: string, count: number } - Success message and count of facts stored.
 *  - 400 Bad Request: { message: string } - Invalid request body or missing fields.
 *  - 401 Unauthorized: { message: string } - User not authenticated.
 *  - 403 Forbidden: { message: string } - Authenticated user doesn't match userId in request.
 *  - 500 Internal Server Error: { message: string } - Server configuration error or extraction failure.
 */
export async function POST(request: Request) {
  // Ensure @/lib/supabase/server-client exists and is correctly configured
  const supabase = createClient()
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error("API Auth Error:", authError)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  let body: ExtractRequestBody
  try {
    // Type assertion after parsing
    body = (await request.json()) as ExtractRequestBody
  } catch (error) {
    console.error("API Request Body Parse Error:", error)
    return NextResponse.json(
      { message: "Invalid request body format" },
      { status: 400 }
    )
  }

  // Use optional chaining for potentially missing optional fields
  const {
    userId,
    chatId,
    messages,
    modelName = "gemini-1.5-flash-latest"
  } = body

  // Validate required fields more robustly after parsing
  if (
    !userId ||
    typeof userId !== "string" ||
    !messages ||
    !Array.isArray(messages) ||
    messages.length === 0 ||
    // Validate content of messages array
    !messages.every(
      msg =>
        typeof msg === "object" &&
        msg !== null &&
        "role" in msg &&
        "content" in msg
    )
  ) {
    return NextResponse.json(
      {
        message:
          "Invalid or missing required fields: userId (string), messages (non-empty array of {role: string, content: string})."
      },
      { status: 400 }
    )
  }

  // Optional fields validation (type checked by ExtractRequestBody, but good practice)
  if (chatId && typeof chatId !== "string") {
    return NextResponse.json(
      { message: "Invalid chatId format" },
      { status: 400 }
    )
  }
  if (modelName && typeof modelName !== "string") {
    return NextResponse.json(
      { message: "Invalid modelName format" },
      { status: 400 }
    )
  }

  // Security check: Ensure the authenticated user matches the userId being processed
  if (user.id !== userId) {
    console.warn(
      `API Forbidden: Authenticated user ${user.id} attempted to process facts for user ${userId}`
    )
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  // Ensure the API key is securely accessed from environment variables server-side
  // Ensure @types/node is installed for process.env
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    console.error("GOOGLE_API_KEY is not set in environment variables.")
    return NextResponse.json(
      { message: "Server configuration error: Missing API key" },
      { status: 500 }
    )
  }

  try {
    console.log(
      `API: Starting fact extraction for user ${userId}, chat ${chatId || "N/A"}`
    )

    // Messages are already validated to be SimpleMessage[]
    const typedMessages = messages

    const storedFacts = await processAndStoreConversationFacts({
      messages: typedMessages,
      userId,
      chatId,
      apiKey,
      modelName,
      client: supabase // Pass server client
    })
    console.log(
      `API: Fact extraction complete for user ${userId}, chat ${chatId || "N/A"}. Stored ${storedFacts.length} facts.`
    )

    return NextResponse.json(
      {
        message: "Fact extraction successful",
        count: storedFacts.length
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    // Use unknown for caught errors
    console.error(
      `API: Error during fact extraction for user ${userId}, chat ${chatId || "N/A"}:`,
      error
    )
    // Type check the error before accessing properties
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Fact extraction process failed due to an unknown error"
    return NextResponse.json({ message: errorMessage }, { status: 500 })
  }
}
