import { todayISO } from '../lib/date'
import { usePlannerStore } from '../store/usePlannerStore'

/** The only error that takes the whole screen. Everything else is a toast. */
export function DatabaseErrorScreen({ message }: { message: string }) {
  const data = usePlannerStore((s) => s.data)
  const buildExportFile = usePlannerStore((s) => s.buildExportFile)
  const retry = () => usePlannerStore.getState().start()

  // Only if something was read before it broke: offering to export nothing
  // would be a cruel button.
  const hayAlgoQueSalvar = Object.values(data).some((lista) => lista.length > 0)

  function exportar() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(buildExportFile(), null, 2)], { type: 'application/json' }),
    )
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `plannermi-rescate-${todayISO()}.json`
    enlace.click()
    URL.revokeObjectURL(url)
  }

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
      {hayAlgoQueSalvar && (
        <button
          type="button"
          onClick={exportar}
          className="min-h-[44px] rounded-card border border-border-strong px-6 text-body"
        >
          Exportar lo que se pudo leer
        </button>
      )}
    </div>
  )
}
