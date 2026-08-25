import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from './client'

/**
 * Sign in with GitHub, on a phone.
 *
 * The browser tab is opened by us and handed back by us: GitHub redirects to
 * Supabase, Supabase redirects to `plannermi://auth-callback`, and
 * `openAuthSessionAsync` returns that URL instead of leaving the app. Because
 * the app was never killed, the PKCE verifier is still in storage and the code
 * can be exchanged — a redirect through an external browser would lose it.
 *
 * In Expo Go the redirect is an `exp://` URL, not `plannermi://`, so this
 * needs a real build (the `apk` profile) to work end to end.
 */
export async function signInConGitHub(): Promise<string | null> {
  const client = supabase()
  if (!client) return 'La app no está configurada para iniciar sesión'

  const redirectTo = Linking.createURL('auth-callback')

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo, skipBrowserRedirect: true },
  })
  if (error) return error.message
  if (!data.url) return 'GitHub no devolvió una dirección'

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  // Backing out of the browser is not an error worth showing.
  if (result.type !== 'success') return null

  const code = new URL(result.url).searchParams.get('code')
  if (!code) return 'GitHub no devolvió un código'

  const intercambio = await client.auth.exchangeCodeForSession(code)
  return intercambio.error?.message ?? null
}

export async function signOut(): Promise<string | null> {
  const client = supabase()
  if (!client) return null
  const { error } = await client.auth.signOut()
  return error?.message ?? null
}
