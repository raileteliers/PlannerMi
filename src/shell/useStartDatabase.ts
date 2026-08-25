import { useEffect, useRef } from 'react'
import { createStorage } from '../db'
import { useSession } from '../auth/useSession'
import { usePlannerStore } from '../store/usePlannerStore'

/**
 * Opens the database, and opens it again when the session changes.
 *
 * Signing in and signing out change which database this is — local only, or
 * local synced with the account's — so the store is restarted rather than
 * patched. Keyed by user id and not by a boolean, so Fast Refresh remounting
 * the layout does not open it twice, and so switching accounts is noticed.
 */
export function useStartDatabase(): void {
  const { session, cargando } = useSession()
  const abiertaPara = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    // Opening against "no session" while the stored one is still being read
    // would start on the local base and then throw it away a tick later.
    if (cargando) return

    const usuario = session?.user.id ?? null
    if (abiertaPara.current === usuario) return
    abiertaPara.current = usuario

    const store = usePlannerStore.getState()
    void store.start(() => createStorage(session, () => void store.reload()))
  }, [session, cargando])
}
