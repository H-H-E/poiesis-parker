import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { workspaceId, adminPrompt } = await request.json()

    // Check for required fields
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID is required" },
        { status: 400 }
      )
    }

    // Check if the user is authenticated and is an admin
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized - Admin privileges required" },
        { status: 403 }
      )
    }

    // Update workspace admin prompt
    const { data: workspace, error: updateError } = await supabase
      .from("workspaces")
      .update({ admin_prompt: adminPrompt })
      .eq("id", workspaceId)
      .select("id, name, admin_prompt")
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update workspace admin prompt" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Workspace admin prompt updated successfully",
      workspace
    })
  } catch (error) {
    console.error("Error in POST /api/admin/setworkspaceadminprompt:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
