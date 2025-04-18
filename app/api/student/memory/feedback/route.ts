import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    // Get cookie store
    const cookieStore = cookies()

    // Create a server-side Supabase client with cookie store
    const supabase = createClient(cookieStore)

    // Check if user is authenticated
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the current user ID from the session
    const userId = session.user.id

    // Parse the request body
    const { factId, feedbackType } = await request.json()

    if (!factId || !feedbackType) {
      return NextResponse.json(
        { error: "Missing required parameters: factId and feedbackType" },
        { status: 400 }
      )
    }

    // Check if the fact belongs to the user
    const { data: factData, error: factError } = await supabase
      .from("memory_facts")
      .select("id")
      .eq("id", factId)
      .eq("user_id", userId)
      .single()

    if (factError || !factData) {
      return NextResponse.json(
        { error: "Fact not found or you do not have permission" },
        { status: 404 }
      )
    }

    // Record the feedback
    // This implementation depends on your specific database schema
    // Here's a simple example:
    const { error: feedbackError } = await supabase
      .from("memory_feedback")
      .insert({
        fact_id: factId,
        user_id: userId,
        feedback_type: feedbackType,
        created_at: new Date().toISOString()
      })

    if (feedbackError) {
      console.error("Error recording feedback:", feedbackError)
      return NextResponse.json(
        { error: "Failed to record feedback" },
        { status: 500 }
      )
    }

    // Optionally, update the fact's confidence or status based on the feedback
    // This would depend on your business logic
    let confidenceDelta = 0

    switch (feedbackType) {
      case "correct":
        confidenceDelta = 0.1 // Increase confidence
        break
      case "incorrect":
        confidenceDelta = -0.2 // Decrease confidence more significantly
        break
      case "outdated":
        confidenceDelta = -0.1 // Slightly decrease confidence
        break
    }

    if (confidenceDelta !== 0) {
      // Update the fact's confidence
      await supabase.rpc("update_fact_confidence", {
        p_fact_id: factId,
        p_confidence_delta: confidenceDelta
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in memory feedback API route:", error)
    return NextResponse.json(
      { error: "Failed to process feedback" },
      { status: 500 }
    )
  }
}
