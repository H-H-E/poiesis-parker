import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
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

    // Fetch all prompts
    const { data: prompts, error: promptsError } = await supabase
      .from("prompts")
      .select("*")
      .order("created_at", { ascending: false })

    if (promptsError) {
      return NextResponse.json(
        { error: "Failed to fetch prompts" },
        { status: 500 }
      )
    }

    return NextResponse.json({ prompts })
  } catch (error) {
    console.error("Error in GET /api/admin/getprompts:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
