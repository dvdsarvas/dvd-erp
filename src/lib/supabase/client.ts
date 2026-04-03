import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

let supabaseInstance: SupabaseClient<Database> | null = null

export function getSupabase(): SupabaseClient<Database> {
  if (supabaseInstance) return supabaseInstance

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase URL i ANON KEY moraju biti postavljeni u .env.local')
  }

  supabaseInstance = createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })

  return supabaseInstance
}

// Alias za kraće korištenje u komponentama
export const supabase = getSupabase()
