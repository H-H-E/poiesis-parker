import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { name, content, is_global } = await request.json()

    // Check for required fields
    if (!name || !content) {
      return NextResponse.json(
        { error: "Name and content are required" },
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

    // Create prompt
    const promptId = uuidv4()
    const timestamp = new Date().toISOString()

    const { data: prompt, error: promptError } = await supabase
      .from("prompts")
      .insert([
        {
          id: promptId,
          name,
          content,
          is_global,
          user_id: user.id,
          created_at: timestamp,
          updated_at: timestamp
        }
      ])
      .select("*")
      .single()

    if (promptError) {
      return NextResponse.json(
        { error: "Failed to create prompt" },
        { status: 500 }
      )
    }

    return NextResponse.json({ prompt })
  } catch (error) {
    console.error("Error in POST /api/admin/createprompt:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
