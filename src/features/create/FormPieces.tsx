import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'

/** The one field every form starts with. */
export function CampoTitulo({
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoFocus?: boolean
}) {
  return (
    <input
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label="Título"
      className="min-h-[44px] border-b border-border-hairline text-body outline-none placeholder:text-ink-tertiary"
    />
  )
}

/** Save, the error line, and delete when editing something that exists. */
export function FormActions({
  error,
  onGuardar,
  onEliminar,
  tituloEliminar,
  detalleEliminar,
  labelEliminar = 'Eliminar',
}: {
  error: string | null
  onGuardar: () => void
  onEliminar?: () => void
  tituloEliminar?: string
  detalleEliminar?: string
  labelEliminar?: string
}) {
  const [confirmando, setConfirmando] = useState(false)

  return (
    <>
      {error && <p className="text-meta text-importance">{error}</p>}

      <button
        type="button"
        onClick={onGuardar}
        className="min-h-[44px] w-full rounded-card bg-accent text-body text-on-accent"
      >
        Guardar
      </button>

      {onEliminar && (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="min-h-[44px] w-full text-body text-importance"
        >
          {labelEliminar}
        </button>
      )}

      {confirmando && onEliminar && (
        <ConfirmDialog
          titulo={tituloEliminar ?? '¿Eliminar?'}
          {...(detalleEliminar ? { detalle: detalleEliminar } : {})}
          onConfirm={() => {
            setConfirmando(false)
            onEliminar()
          }}
          onCancel={() => setConfirmando(false)}
        />
      )}
    </>
  )
}
