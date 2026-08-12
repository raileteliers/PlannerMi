import { useEffect, useRef } from 'react'

/**
 * Used for deletes, where the message carries the concrete numbers
 * ("Se eliminarán 3 evaluaciones y 7 tareas").
 */
export function ConfirmDialog({
  titulo,
  detalle,
  confirmLabel = 'Eliminar',
  onConfirm,
  onCancel,
}: {
  titulo: string
  detalle?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-card bg-surface-raised p-4 shadow-float"
      >
        <p className="text-body font-bold">{titulo}</p>
        {detalle && <p className="mt-2 text-body text-ink-secondary">{detalle}</p>}
        <div className="mt-6 flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="min-h-[44px] flex-1 rounded-card border border-border-strong text-body"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] flex-1 rounded-card bg-importance text-body font-bold text-on-accent"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
