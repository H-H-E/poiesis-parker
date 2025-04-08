import { NextRequest, NextResponse } from "next/server"
import type { ModelsUpdatePayload } from "@/types/model-perm-update"
import { createServiceClient } from "@/lib/supabase/service-client"

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const payload: ModelsUpdatePayload = await req.json()

  try {
    const updates = payload.updates.map(async update => {
      const { data, error } = await supabase
        .from("profiles")
        .update({ permitted_models: update.modelIds })
        .match({ user_id: update.userId })

      if (error) {
        throw error
      }

      return data
    })

    await Promise.all(updates)

    return NextResponse.json({
      message: "Model permissions updated successfully."
    })
  } catch (error) {
    return NextResponse.json({ code: 500 }, { status: 500 })
  }
}
