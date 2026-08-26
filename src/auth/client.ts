import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from './config'

/**
 * The phone's client.
 *
 * The session goes in AsyncStorage and not expo-secure-store: a session is two
 * JWTs and SecureStore caps a value at 2048 bytes, so it would have to be
 * split across keys. The tokens are short-lived and the device is the user's
 * own, which is the tradeoff Supabase's own React Native guide makes.
 */
let cliente: SupabaseClient | null = null

export function supabase(): SupabaseClient | null {
  if (!supabaseConfigurado()) return null

  cliente ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // Asked for explicitly: supabase-js defaults to `implicit`, which brings
      // the session back as `#access_token=...` in the fragment. The sign-in
      // here reads a `?code=` and exchanges it, so under the default there was
      // no code to find and signing in on a phone could not complete.
      //
      // It is also the right flow for an app rather than a page: implicit puts
      // the tokens in a URL the OS hands around, and PKCE hands over a code
      // that is worthless without a verifier this app never sent anywhere.
      flowType: 'pkce',
      // There is no URL to read a session out of: the deep link is handled by
      // WebBrowser.openAuthSessionAsync, which hands the code back directly.
      detectSessionInUrl: false,
    },
  })

  return cliente
}

/**
 * Refreshing in the background wakes the radio for nothing. Tie it to the app
 * being in front, the way Supabase documents for React Native.
 */
AppState.addEventListener('change', (state) => {
  const client = cliente
  if (!client) return
  if (state === 'active') void client.auth.startAutoRefresh()
  else void client.auth.stopAutoRefresh()
})
