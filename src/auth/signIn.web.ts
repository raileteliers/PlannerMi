import { supabase } from './client'

/**
 * Sign in with GitHub, in a browser.
 *
 * `redirectTo` is the root of the site, where the real index.html lives —
 * `window.location.origin + '/PlannerMi/'` on Pages. Not a route inside the
 * app: that would depend on the 404.html fallback to serve the page that is
 * supposed to read the `?code=`, which is one moving part too many.
 *
 * The page navigates away and comes back; the client picks up the code from
 * the URL on load and cleans it. So there is nothing to await here.
 */
export async function signInConGitHub(): Promise<string | null> {
  const client = supabase()
  if (!client) return 'La app no está configurada para iniciar sesión'

  const { error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin + baseUrl() },
  })
  return error?.message ?? null
}

export async function signOut(): Promise<string | null> {
  const client = supabase()
  if (!client) return null
  const { error } = await client.auth.signOut()
  return error?.message ?? null
}

/**
 * Where to land after GitHub: the root the app is actually being served from.
 *
 * Read from the current location and not from EXPO_BASE_URL alone, because the
 * two disagree in development. The published site lives under /PlannerMi/, but
 * `expo start --web` serves the app at the root — so trusting the configured
 * base sends the login back to a path the router does not know, and the session
 * lands on an "Unmatched Route" screen with the tokens in the address bar.
 */
function baseUrl(): string {
  const configurada = process.env.EXPO_BASE_URL ?? ''
  if (configurada === '') return '/'

  const base = configurada.endsWith('/') ? configurada : `${configurada}/`
  return window.location.pathname.startsWith(configurada) ? base : '/'
}
