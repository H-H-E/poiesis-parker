import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// GET global settings including student system prompt
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

    // Get the global settings
    const { data: settings, error: settingsError } = await supabase
      .from("global_settings")
      .select("*")
      .limit(1)
      .single()

    if (settingsError) {
      return NextResponse.json(
        { error: "Failed to fetch global settings" },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error in GET /api/admin/global-settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST to update global settings
export async function POST(request: Request) {
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

    const { student_system_prompt } = await request.json()

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

    // Get the first settings row id
    const { data: settingRow, error: getError } = await supabase
      .from("global_settings")
      .select("id")
      .limit(1)
      .single()

    if (getError) {
      // If no row exists, create one
      const { data: newSettings, error: insertError } = await supabase
        .from("global_settings")
        .insert({ student_system_prompt })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json(
          { error: "Failed to create global settings" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "Global settings created successfully",
        settings: newSettings
      })
    }

    // Update the existing row
    const { data: updatedSettings, error: updateError } = await supabase
      .from("global_settings")
      .update({ student_system_prompt })
      .eq("id", settingRow.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update global settings" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Global settings updated successfully",
      settings: updatedSettings
    })
  } catch (error) {
    console.error("Error in POST /api/admin/global-settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
