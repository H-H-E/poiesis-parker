import { createClient } from "@supabase/supabase-js"

export const createServiceClient = () => {
  const svcClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  return svcClient
}
