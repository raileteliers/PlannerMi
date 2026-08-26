import { useEffect, useRef, useState } from 'react'
import * as Linking from 'expo-linking'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { supabase } from '../src/auth/client'

/**
 * What came back, named but never quoted.
 *
 * A failed sign-in is only debuggable if you can see the shape of what
 * arrived, and the shape is all that is safe to show: under the implicit flow
 * this URL carries a real access token, and a screenshot of it would hand that
 * token to whoever reads the screenshot. Names yes, values never.
 */
function formaDeLaUrl(url: string | null): string {
  if (!url) return 'no llegó ninguna dirección'
  const [antes, fragmento] = url.split('#')
  const query = antes?.split('?')[1] ?? ''
  const nombres = (texto: string) =>
    texto
      .split('&')
      .map((p) => p.split('=')[0])
      .filter(Boolean)
      .join(', ')

  const partes = [
    query ? `query: ${nombres(query)}` : 'sin query',
    fragmento ? `fragmento: ${nombres(fragmento)}` : 'sin fragmento',
  ]
  return partes.join(' · ')
}

/**
 * Where GitHub lands after signing in on a phone.
 *
 * `signInConGitHub` tries to keep the whole round trip inside
 * `WebBrowser.openAuthSessionAsync`, which hands the redirect back without the
 * app ever leaving. When that interception does not happen — and on Android it
 * does not always — the OS resolves `plannermi://auth-callback` itself and
 * opens the app here instead. Without this route that arrival was an
 * "Unmatched Route" screen with the code sitting unused in the address bar.
 *
 * Exchanging the code again is safe to attempt: the PKCE verifier lives in
 * AsyncStorage, so it survives even a cold start from the deep link.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string
    error?: string
    error_description?: string
  }>()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const url = Linking.useURL()
  // Exchanged once. The effect can run twice — a re-render, a remount — and
  // the second attempt would fail on a code that is already spent.
  const intentado = useRef(false)

  useEffect(() => {
    if (intentado.current) return
    intentado.current = true

    void (async () => {
      // GitHub itself refused, which is not something to retry.
      if (params.error) {
        setError(params.error_description ?? params.error)
        return
      }

      const client = supabase()
      if (!client) {
        setError('La app no está configurada para iniciar sesión')
        return
      }

      // Already signed in: the other path got there first and this arrival is
      // the same trip's echo. Nothing to exchange, just go home.
      const { data: sesion } = await client.auth.getSession()
      if (sesion.session) return router.replace('/mes')

      if (!params.code) {
        setError('GitHub no devolvió un código')
        return
      }

      const { error: fallo } = await client.auth.exchangeCodeForSession(params.code)
      if (fallo) {
        setError(fallo.message)
        return
      }
      router.replace('/mes')
    })()
  }, [params.code, params.error, params.error_description, router])

  // No spinner while it works: this screen is on the way to somewhere else and
  // lasts a moment. It only draws when there is something to say.
  if (!error) return <View className="flex-1" />

  return (
    <View className="flex-1 justify-center px-6">
      <Text className="text-title font-bold text-ink">No se pudo entrar</Text>
      <Text className="mt-2 text-body text-ink-secondary">{error}</Text>
      <Text className="mt-4 text-meta text-ink-tertiary">Llegó con {formaDeLaUrl(url)}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace('/mes')}
        className="mt-6 min-h-[44px] items-center justify-center rounded-card bg-accent"
      >
        <Text className="text-body text-on-accent">Volver</Text>
      </Pressable>
    </View>
  )
}
