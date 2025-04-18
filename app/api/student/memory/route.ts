import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { searchStudentFacts, type FactType } from "@/lib/memory/fact-management"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
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

    // Parse the request query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query") || ""
    const factTypesParam = searchParams.get("factTypes")
    const factTypes = factTypesParam
      ? (factTypesParam.split(",") as FactType[])
      : []
    const includeInactive = searchParams.get("includeInactive") === "true"
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10)
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10)
    const fromDate = searchParams.get("fromDate") || undefined
    const toDate = searchParams.get("toDate") || undefined
    const minConfidenceParam = searchParams.get("minConfidence")
    const minConfidence = minConfidenceParam
      ? Number.parseFloat(minConfidenceParam)
      : undefined
    const sortBy = (searchParams.get("sortBy") || "updated_at") as
      | "created_at"
      | "updated_at"
      | "confidence"
    const sortOrder = (searchParams.get("sortOrder") || "desc") as
      | "asc"
      | "desc"

    // Get the facts using the fact-management library
    const result = await searchStudentFacts({
      userId,
      searchParams: {
        query,
        factTypes,
        includeInactive,
        limit,
        offset,
        fromDate,
        toDate,
        minConfidence,
        sortBy,
        sortOrder
      },
      client: supabase
    })

    return NextResponse.json({
      facts: result.facts,
      totalCount: result.count,
      hasMore: result.hasMore
    })
  } catch (error) {
    console.error("Error in student memory API route:", error)
    return NextResponse.json(
      { error: "Failed to retrieve your memory facts" },
      { status: 500 }
    )
  }
}
