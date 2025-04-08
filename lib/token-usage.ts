import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Tables, TablesInsert } from "@/supabase/types"
import { encode } from "gpt-tokenizer"

export interface TokenUsageData {
  userId: string
  chatId?: string
  modelId: string
  inputTokens: number
  outputTokens: number
  workspaceId?: string
}

/**
 * Calculates token counts for input and output text
 */
export function countTokens(text: string): number {
  return encode(text).length
}

/**
 * Logs token usage to the database
 */
export async function logTokenUsage(
  supabase: SupabaseClient<Database, "public">,
  data: TokenUsageData
) {
  try {
    const { userId, chatId, modelId, inputTokens, outputTokens, workspaceId } =
      data
    const totalTokens = inputTokens + outputTokens

    const insertData: TablesInsert<"token_usage"> = {
      user_id: userId,
      chat_id: chatId,
      model_id: modelId,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      workspace_id: workspaceId
    }

    const { error } = await supabase.from("token_usage").insert(insertData)

    if (error) {
      console.error("Error logging token usage:", error)
    }

    return { success: !error, error }
  } catch (error) {
    console.error("Exception logging token usage:", error)
    return { success: false, error }
  }
}

/**
 * Gets total token usage for a user within a date range
 */
export async function getUserTokenUsage(
  supabase: SupabaseClient<Database, "public">,
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    let query = supabase.from("token_usage").select("*").eq("user_id", userId)

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString())
    }

    if (endDate) {
      query = query.lte("created_at", endDate.toISOString())
    }

    const { data, error } = await query
    const typedData = data as Tables<"token_usage">[] | null // Type assertion

    if (error) {
      console.error("Error fetching user token usage:", error)
      return { success: false, error, data: null }
    }

    if (!typedData) {
      return {
        success: true,
        data: {
          records: [],
          totals: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
        }
      }
    }

    // Calculate totals
    const totals = {
      inputTokens: typedData.reduce(
        (sum, record) => sum + (record.input_tokens ?? 0),
        0
      ),
      outputTokens: typedData.reduce(
        (sum, record) => sum + (record.output_tokens ?? 0),
        0
      ),
      totalTokens: typedData.reduce(
        (sum, record) => sum + (record.total_tokens ?? 0),
        0
      )
    }

    return {
      success: true,
      data: {
        records: typedData,
        totals
      }
    }
  } catch (error) {
    console.error("Exception fetching user token usage:", error)
    return { success: false, error, data: null }
  }
}

/**
 * Gets token usage statistics for a workspace
 */
export async function getWorkspaceTokenUsage(
  supabase: SupabaseClient<Database, "public">,
  workspaceId: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    let query = supabase
      .from("token_usage")
      .select("*")
      .eq("workspace_id", workspaceId)

    if (startDate) {
      query = query.gte("created_at", startDate.toISOString())
    }

    if (endDate) {
      query = query.lte("created_at", endDate.toISOString())
    }

    const { data, error } = await query
    const typedData = data as Tables<"token_usage">[] | null // Type assertion

    if (error) {
      console.error("Error fetching workspace token usage:", error)
      return { success: false, error, data: null }
    }

    if (!typedData) {
      return {
        success: true,
        data: {
          records: [],
          userUsage: {},
          totals: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
        }
      }
    }

    // Group by user
    const userUsage: Record<
      string,
      { inputTokens: number; outputTokens: number; totalTokens: number }
    > = {}

    for (const record of typedData) {
      if (!userUsage[record.user_id]) {
        userUsage[record.user_id] = {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0
        }
      }

      userUsage[record.user_id].inputTokens += record.input_tokens ?? 0
      userUsage[record.user_id].outputTokens += record.output_tokens ?? 0
      userUsage[record.user_id].totalTokens += record.total_tokens ?? 0
    }

    // Calculate totals
    const totals = {
      inputTokens: typedData.reduce(
        (sum, record) => sum + (record.input_tokens ?? 0),
        0
      ),
      outputTokens: typedData.reduce(
        (sum, record) => sum + (record.output_tokens ?? 0),
        0
      ),
      totalTokens: typedData.reduce(
        (sum, record) => sum + (record.total_tokens ?? 0),
        0
      )
    }

    return {
      success: true,
      data: {
        records: typedData,
        userUsage,
        totals
      }
    }
  } catch (error) {
    console.error("Exception fetching workspace token usage:", error)
    return { success: false, error, data: null }
  }
}
