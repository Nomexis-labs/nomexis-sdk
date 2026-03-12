import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cachedClient: SupabaseClient | null = null

export function getSupabaseServerClient(): SupabaseClient | null {
  if (cachedClient) {
    return cachedClient
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey) {
    console.warn("Supabase configuration missing: ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set")
    return null
  }

  cachedClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  return cachedClient
}

// Final cleanup marker
