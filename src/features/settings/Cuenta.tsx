import { useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import { signInConGitHub, signOut, useSession } from '../../auth/useSession'

/**
 * The account, which is what makes the phone and the browser show the same
 * thing. Signing in is with GitHub because it is the account the user already
 * has, and because it saves the app from ever handling a password.
 *
 * Signed out the app is not crippled: on a phone it is the local base it has
 * always been. Only the sharing between devices depends on this.
 */
export function Cuenta() {
  const { session, cargando, disponible } = useSession()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!disponible) return null

  async function entrar() {
    setOcupado(true)
    setError(null)
    setError(await signInConGitHub())
    setOcupado(false)
  }

  async function salir() {
    setOcupado(true)
    setError(await signOut())
    setOcupado(false)
  }

  const correo = session?.user.email ?? session?.user.user_metadata['user_name']

  return (
    <View className="mt-8 border-t border-border-hairline pt-4">
      <Text className="text-meta text-ink-tertiary">Cuenta</Text>

      {session ? (
        <>
          <Text className="mt-2 text-body text-ink">
            {typeof correo === 'string' ? correo : 'Sesión iniciada'}
          </Text>
          <Text className="mt-1 text-meta text-ink-secondary">
            {Platform.OS === 'web'
              ? 'Tus datos se guardan en tu cuenta.'
              : 'Tus datos se guardan en el teléfono y se sincronizan con tu cuenta.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={ocupado}
            onPress={() => void salir()}
            className="mt-3 min-h-[44px] justify-center rounded-card border border-border-strong px-4"
          >
            <Text className="text-body text-ink">Cerrar sesión</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text className="mt-2 text-meta text-ink-secondary">
            Iniciá sesión para ver lo mismo en el teléfono y en el navegador.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={ocupado || cargando}
            onPress={() => void entrar()}
            className="mt-3 min-h-[44px] justify-center rounded-card bg-accent px-4"
          >
            <Text className="text-body text-on-accent">
              {ocupado ? 'Abriendo GitHub…' : 'Entrar con GitHub'}
            </Text>
          </Pressable>
        </>
      )}

      {error && <Text className="mt-2 text-meta text-importance">{error}</Text>}
    </View>
  )
}
