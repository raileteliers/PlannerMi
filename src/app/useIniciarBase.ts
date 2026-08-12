import { useEffect } from 'react'
import { usePlannerStore } from '../store/usePlannerStore'

/** StrictMode mounts twice in dev; the database is opened once. */
let iniciado = false

export function useIniciarBase(): void {
  useEffect(() => {
    if (iniciado) return
    iniciado = true
    void usePlannerStore.getState().iniciar()
  }, [])
}
