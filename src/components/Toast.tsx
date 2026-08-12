import { useEffect } from 'react'
import { usePlannerStore } from '../store/usePlannerStore'

const VISIBLE_MS = 4000

/**
 * The only transient message in the app: a write failed and the screen was
 * rolled back to what is actually saved.
 */
export function Toast() {
  const mensaje = usePlannerStore((s) => s.writeError)
  const descartar = usePlannerStore((s) => s.dismissWriteError)

  useEffect(() => {
    if (!mensaje) return
    const id = setTimeout(descartar, VISIBLE_MS)
    return () => clearTimeout(id)
  }, [mensaje, descartar])

  if (!mensaje) return null

  return (
    <button
      type="button"
      onClick={descartar}
      role="status"
      className="absolute bottom-4 left-4 z-40 flex min-h-[44px] items-center rounded-card bg-accent px-4 text-body text-on-accent shadow-float"
    >
      {mensaje}
    </button>
  )
}
