import { usePlannerStore } from '../store/usePlannerStore'

/**
 * The only error that takes the whole screen. Everything else is a toast.
 * Export is offered too, but only once there is something to export.
 */
export function DatabaseErrorScreen({ mensaje }: { mensaje: string }) {
  const reintentar = () => usePlannerStore.getState().iniciar()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
      <p className="text-title font-bold">{mensaje}</p>
      <p className="text-body text-ink-secondary">
        Puede pasar si el almacenamiento está lleno o si estás en una ventana de
        incógnito.
      </p>
      <button
        type="button"
        onClick={() => void reintentar()}
        className="min-h-[44px] rounded-card bg-accent px-6 text-body text-on-accent"
      >
        Reintentar
      </button>
    </div>
  )
}
