import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    // Get cookie store
    const cookieStore = cookies()

    // Create a server-side Supabase client with cookie store
    const supabase = createClient(cookieStore)

    // Check if user has admin privileges
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse the request body
    const factData = await request.json()

    // Validate required parameters
    if (!factData.id) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      )
    }

    // Prepare data for update
    const updateData = {
      content: factData.content,
      fact_type: factData.factType,
      confidence: factData.confidence,
      is_active: factData.isActive,
      updated_at: new Date().toISOString()
    }

    // Update the fact in the database
    const { data, error } = await supabase
      .from("student_facts")
      .update(updateData)
      .eq("id", factData.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating student fact:", error)
      return NextResponse.json(
        { error: "Failed to update student fact" },
        { status: 500 }
      )
    }

    // Return success response with updated data
    return NextResponse.json({
      success: true,
      fact: {
        id: data.id,
        content: data.content,
        factType: data.fact_type,
        confidence: data.confidence,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        originContext: data.source_context
      }
    })
  } catch (error) {
    console.error("Error in updatestudentfact API route:", error)
    return NextResponse.json(
      { error: "Failed to update student fact" },
      { status: 500 }
    )
  }
}
