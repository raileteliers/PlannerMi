import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './client'
import { signInConGitHub, signOut } from './signIn'

export interface SesionState {
  session: Session | null
  /** True until the stored session has been read. Not "signing in". */
  cargando: boolean
  /** False when the build has no Supabase keys: the app still works, alone. */
  disponible: boolean
}

/**
 * The session, as state.
 *
 * `onAuthStateChange` fires on sign-in, sign-out and every token refresh, and
 * on subscribing it replays the stored session — which is why there is no
 * separate getSession() call racing it.
 */
export function useSession(): SesionState {
  const client = supabase()
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(client !== null)

  useEffect(() => {
    if (!client) return

    const { data } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setCargando(false)
    })

    return () => data.subscription.unsubscribe()
  }, [client])

  return { session, cargando, disponible: client !== null }
}

export { signInConGitHub, signOut }
