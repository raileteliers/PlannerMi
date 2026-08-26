import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from './config'

/**
 * The browser's client. Everything is the default: the session lives in
 * localStorage, and `detectSessionInUrl` is what completes the GitHub sign-in
 * — the redirect comes back and the client reads the session out of the URL
 * and cleans it.
 *
 * Left on the default `implicit` flow, unlike the phone's client, which has to
 * ask for `pkce`. Here it makes no difference: `detectSessionInUrl` reads the
 * fragment implicit returns as readily as a code, and this flow is the one
 * that has been verified working in the published site.
 */
let cliente: SupabaseClient | null = null

export function supabase(): SupabaseClient | null {
  if (!supabaseConfigurado()) return null
  cliente ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return cliente
}
