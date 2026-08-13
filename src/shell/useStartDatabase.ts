import { useEffect } from 'react'
import { usePlannerStore } from '../store/usePlannerStore'

/** Fast Refresh remounts the layout; the database is opened once. */
let started = false

export function useStartDatabase(): void {
  useEffect(() => {
    if (started) return
    started = true
    void usePlannerStore.getState().start()
  }, [])
}
