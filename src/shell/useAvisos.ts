import { useEffect, useRef } from 'react'
import { pedirPermisoNotificaciones, reprogramarAvisos } from '../lib/notificaciones'
import { usePlannerStore } from '../store/usePlannerStore'

/**
 * Rebuilding the whole schedule after every keystroke would be wasteful, and
 * an edit in progress is not worth notifying about yet.
 */
const ESPERA_MS = 1500

/** Asked once per launch, not once per edit. */
let permiso: Promise<boolean> | null = null

/**
 * Keeps the phone's pending notifications in step with the dataset.
 *
 * Derived rather than event-driven on purpose: any edit — create, delete,
 * import, cascade — lands in `data`, so nothing has to remember to notify.
 */
export function useAvisos(): void {
  const status = usePlannerStore((s) => s.status)
  const data = usePlannerStore((s) => s.data)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Scheduling against the empty dataset would cancel everything and put
    // nothing back, which is exactly wrong while the database is still opening.
    if (status !== 'ready') return

    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void (async () => {
        permiso ??= pedirPermisoNotificaciones()
        if (!(await permiso)) return
        await reprogramarAvisos(data)
      })()
    }, ESPERA_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [status, data])
}
