import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from './config'

/**
 * The browser's client. Everything is the default: the session lives in
 * localStorage, and `detectSessionInUrl` is what completes the GitHub sign-in
 * — the redirect comes back to the page with a `?code=`, the client trades it
 * for a session and cleans the URL.
 */
let cliente: SupabaseClient | null = null

export function supabase(): SupabaseClient | null {
  if (!supabaseConfigurado()) return null
  cliente ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return cliente
}
