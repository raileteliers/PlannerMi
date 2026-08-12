import { usePlannerStore } from '../store/usePlannerStore'

/** The only error that takes the whole screen. Everything else is a toast. */
export function DatabaseErrorScreen({ message }: { message: string }) {
  const retry = () => usePlannerStore.getState().start()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
      <p className="text-title font-bold">{message}</p>
      <p className="text-body text-ink-secondary">
        Puede pasar si el almacenamiento está lleno o si estás en una ventana de
        incógnito.
      </p>
      <button
        type="button"
        onClick={() => void retry()}
        className="min-h-[44px] rounded-card bg-accent px-6 text-body text-on-accent"
      >
        Reintentar
      </button>
    </div>
  )
}
