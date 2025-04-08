import type { Database } from "@/supabase/types"
import { createClient } from "@supabase/supabase-js"
import type { ChatSettings } from "@/types"
import { buildFinalMessages } from "@/lib/build-prompt"
import type { MessageImage, ChatPayload } from "@/types"

// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
}

export async function POST(request: Request) {
  try {
    // Check for required environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables")
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

    // Parse JSON request data
    const json = await request.json()
    const {
      chatSettings,
      chatMessages,
      chatFileItems = [],
      messageFileItems = [],
      assistant = null,
      chatImages = [],
      profile
    } = json

    // Get the workspace instructions
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", chatSettings.workspaceId || "")
      .single()

    if (workspaceError) {
      console.error(workspaceError)
      return new Response(
        JSON.stringify({
          error: "There was an error fetching the workspace."
        }),
        {
          status: 500,
          headers: corsHeaders
        }
      )
    }

    // Fetch global student system prompt
    const { data: globalSettings, error: globalSettingsError } = await supabase
      .from("global_settings")
      .select("student_system_prompt")
      .limit(1)
      .single()

    let studentSystemPrompt = null
    if (!globalSettingsError && globalSettings) {
      studentSystemPrompt = globalSettings.student_system_prompt
    }

    // Build the payload
    const payload: ChatPayload = {
      chatSettings,
      workspaceInstructions: workspace?.instructions || "",
      chatMessages,
      chatFileItems,
      messageFileItems,
      assistant,
      adminPrompt: workspace?.admin_prompt || undefined,
      studentSystemPrompt: studentSystemPrompt
    }

    // Build the messages
    const { finalMessages, usedTokens } = await buildFinalMessages(
      payload,
      profile,
      chatImages
    )

    // ... rest of existing code ...
  } catch (error) {
    // ... existing error handling ...
  }
}
