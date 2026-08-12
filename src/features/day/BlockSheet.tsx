import { useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { formatDuracion, parseHoraCorta, toMinutos } from '../../lib/time'
import { usePlannerStore } from '../../store/usePlannerStore'
import type { ISODate } from '../../model/types'
import type { BloqueBorrador } from './blockDraft'

/** Create or edit one block. Times are typed, like dates. */
export function BlockSheet({
  fecha,
  borrador,
  onClose,
}: {
  fecha: ISODate
  borrador: BloqueBorrador
  onClose: () => void
}) {
  const createBloque = usePlannerStore((s) => s.createBloque)
  const updateBloque = usePlannerStore((s) => s.updateBloque)
  const deleteBloque = usePlannerStore((s) => s.deleteBloque)

  const [titulo, setTitulo] = useState(borrador.titulo)
  const [inicio, setInicio] = useState(borrador.horaInicio)
  const [fin, setFin] = useState(borrador.horaFin)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  const horaInicio = parseHoraCorta(inicio)
  const horaFin = parseHoraCorta(fin)
  const duracion =
    horaInicio && horaFin ? toMinutos(horaFin) - toMinutos(horaInicio) : null

  async function guardar() {
    if (titulo.trim() === '') return setError('Ponele un título.')
    if (!horaInicio || !horaFin) return setError('Revisá las horas.')
    if (duracion === null || duracion <= 0) {
      return setError('La hora de término tiene que ser posterior.')
    }

    const campos = {
      fecha,
      titulo: titulo.trim(),
      horaInicio,
      horaFin,
      ...(borrador.ref ? { ref: borrador.ref } : {}),
    }
    const ok = borrador.id
      ? await updateBloque(borrador.id, campos)
      : (await createBloque(campos)) !== null
    if (ok) onClose()
  }

  return (
    <BottomSheet titulo={borrador.id ? 'Editar bloque' : 'Nuevo bloque'} onClose={onClose}>
      <div className="flex flex-col gap-3 pt-1 pb-2">
        <input
          value={titulo}
          autoFocus={titulo === ''}
          onChange={(e) => {
            setTitulo(e.target.value)
            setError(null)
          }}
          placeholder="¿Qué vas a hacer?"
          aria-label="Título del bloque"
          className="min-h-[44px] w-full border-b border-border-hairline text-body outline-none placeholder:text-ink-tertiary"
        />

        <div className="flex items-center gap-3">
          <CampoHora label="Desde" value={inicio} onChange={setInicio} />
          <CampoHora label="Hasta" value={fin} onChange={setFin} />
          <span className="self-end pb-2 text-meta text-ink-tertiary">
            {duracion !== null && duracion > 0 ? formatDuracion(duracion) : '—'}
          </span>
        </div>

        {error && <p className="text-meta text-importance">{error}</p>}

        <button
          type="button"
          onClick={() => void guardar()}
          className="min-h-[44px] w-full rounded-card bg-accent text-body text-on-accent"
        >
          Guardar
        </button>

        {borrador.id && (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="min-h-[44px] w-full text-body text-importance"
          >
            Eliminar bloque
          </button>
        )}
      </div>

      {confirmando && borrador.id && (
        <ConfirmDialog
          titulo={`¿Eliminar ${borrador.titulo}?`}
          detalle="El bloque desaparece de tu día."
          onConfirm={() => {
            setConfirmando(false)
            void deleteBloque(borrador.id as string).then(onClose)
          }}
          onCancel={() => setConfirmando(false)}
        />
      )}
    </BottomSheet>
  )
}

function CampoHora({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col">
      <span className="text-meta text-ink-tertiary">{label}</span>
      <input
        value={value}
        inputMode="numeric"
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`min-h-[44px] w-20 border-b border-border-hairline text-body outline-none ${
          parseHoraCorta(value) === null ? 'text-importance' : ''
        }`}
      />
    </label>
  )
}
