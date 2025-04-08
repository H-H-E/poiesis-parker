import { createServiceClient } from "@/lib/supabase/service-client"

export async function GET() {
  const supabase = createServiceClient()

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, username, permitted_models")
      .order("created_at", { ascending: false })
      .limit(100) // Adjust the limit as needed

    if (error) {
      throw error
    }
    console.log(data)
    return Response.json({ users: data })
  } catch (error) {
    return Response.json({ code: 500, message: "lol" })
  }
}
