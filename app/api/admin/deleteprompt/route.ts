import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get prompt ID from query parameters
    const url = new URL(request.url)
    const promptId = url.searchParams.get("id")

    if (!promptId) {
      return NextResponse.json(
        { error: "Prompt ID is required" },
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

    // Delete prompt
    const { error: deleteError } = await supabase
      .from("prompts")
      .delete()
      .eq("id", promptId)

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete prompt" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Prompt deleted successfully"
    })
  } catch (error) {
    console.error("Error in DELETE /api/admin/deleteprompt:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
