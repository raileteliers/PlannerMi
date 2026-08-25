/**
 * Where the database is. Both values are read at build time and end up
 * verbatim in the bundle — that is what EXPO_PUBLIC_ means.
 *
 * That is fine, and intended: the anon key identifies the project, it does not
 * grant anything. What keeps one person's data from another is row level
 * security, in supabase/migrations/0001_records.sql. The service_role key is
 * the one that must never be here, in the repo, or in any EXPO_PUBLIC_ name.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

/**
 * Without these the app still runs — on the phone, against local SQLite, and
 * on the web against memory. It just cannot sign in. Checked rather than
 * assumed so a missing secret in CI shows up as a message and not as a crash
 * on the first request.
 */
export const supabaseConfigurado = (): boolean =>
  SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== ''
