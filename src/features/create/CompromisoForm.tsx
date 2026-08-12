import { useState } from 'react'
import { getDay } from 'date-fns'
import { ChipGroup } from '../../components/ChipGroup'
import { DateInput } from '../../components/DateInput'
import { TimeInput } from '../../components/TimeInput'
import { CATEGORY_LABEL, type CategoriaCompromiso } from '../../design/palette'
import { IMPORTANCIA_LABEL } from '../../design/labels'
import { formatFechaCorta } from '../../lib/dateInput'
import { parseISODate, type ISODate } from '../../lib/date'
import { parseHoraCorta } from '../../lib/time'
import { usePlannerStore } from '../../store/usePlannerStore'
import { IMPORTANCIAS, type Compromiso, type Recurrencia } from '../../model/types'
import { RecurrenceEditor } from './RecurrenceEditor'
import { recurrenciaNueva } from './recurrenceDraft'
import { CampoTitulo, FormActions } from './FormPieces'

const CATEGORIAS = Object.keys(CATEGORY_LABEL) as CategoriaCompromiso[]

export function CompromisoForm({
  fecha: fechaInicial,
  existente,
  /** The day the form was opened from, for cancelling one occurrence. */
  fechaOcurrencia,
  onClose,
}: {
  fecha: ISODate
  existente?: Compromiso
  fechaOcurrencia?: ISODate
  onClose: () => void
}) {
  const createCompromiso = usePlannerStore((s) => s.createCompromiso)
  const updateCompromiso = usePlannerStore((s) => s.updateCompromiso)
  const deleteCompromiso = usePlannerStore((s) => s.deleteCompromiso)

  const [titulo, setTitulo] = useState(existente?.titulo ?? '')
  const [fecha, setFecha] = useState<ISODate | null>(existente?.fecha ?? fechaInicial)
  const [horaTexto, setHoraTexto] = useState(existente?.hora ?? '')
  const [duracion, setDuracion] = useState(
    existente?.duracionMin === undefined ? '' : String(existente.duracionMin),
  )
  const [categoria, setCategoria] = useState<CategoriaCompromiso>(
    existente?.categoria ?? 'personal',
  )
  const [importancia, setImportancia] = useState(existente?.importancia ?? 'media')
  const [recurrencia, setRecurrencia] = useState<Recurrencia | null>(
    existente?.recurrencia ?? null,
  )
  const [error, setError] = useState<string | null>(null)

  const hora = parseHoraCorta(horaTexto)
  const horaValida = horaTexto.trim() === '' || hora !== null

  async function guardar() {
    if (titulo.trim() === '') return setError('Ponele un título.')
    if (!fecha) return setError('Revisá la fecha.')
    if (!horaValida) return setError('Revisá la hora.')

    const duracionMin = duracion.trim() === '' ? undefined : Number(duracion)

    const campos = {
      titulo: titulo.trim(),
      fecha,
      categoria,
      importancia,
      hora: hora ?? undefined,
      duracionMin,
      recurrencia: recurrencia ?? undefined,
      ...(existente?.recordatorioMin === undefined
        ? {}
        : { recordatorioMin: existente.recordatorioMin }),
    }
    const ok = existente
      ? await updateCompromiso(existente.id, campos)
      : (await createCompromiso(limpiar(campos))) !== null
    if (ok) onClose()
  }

  /** Cancelling one occurrence is an exception, not a new entity. */
  async function cancelarOcurrencia() {
    if (!existente?.recurrencia || !fechaOcurrencia) return
    const excepciones = [...existente.recurrencia.excepciones, fechaOcurrencia]
    const ok = await updateCompromiso(existente.id, {
      recurrencia: { ...existente.recurrencia, excepciones },
    })
    if (ok) onClose()
  }

  return (
    <div className="flex flex-col gap-3 pt-1 pb-2">
      <CampoTitulo
        value={titulo}
        onChange={(v) => {
          setTitulo(v)
          setError(null)
        }}
        placeholder="Doctor, gimnasio, trámite…"
        autoFocus={!existente}
      />

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <DateInput
            label={recurrencia ? 'Desde' : 'Fecha'}
            value={fecha}
            onChange={setFecha}
          />
        </div>
        <TimeInput
          label="Hora (opcional)"
          value={horaTexto}
          onChange={(texto) => {
            setHoraTexto(texto)
            setError(null)
          }}
        />
      </div>

      <label className="flex items-center gap-2">
        <span className="text-meta text-ink-tertiary">Dura</span>
        <input
          value={duracion}
          inputMode="numeric"
          placeholder="60"
          aria-label="Duración en minutos"
          onChange={(e) => setDuracion(e.target.value.replace(/\D/g, ''))}
          className="min-h-[44px] w-16 border-b border-border-hairline text-center text-body outline-none placeholder:text-ink-tertiary"
        />
        <span className="text-meta text-ink-tertiary">min</span>
      </label>

      <ChipGroup
        label="Categoría"
        value={categoria}
        options={CATEGORIAS}
        labels={CATEGORY_LABEL}
        onChange={setCategoria}
      />
      <ChipGroup
        label="Importancia"
        value={importancia}
        options={IMPORTANCIAS}
        labels={IMPORTANCIA_LABEL}
        onChange={setImportancia}
      />

      <label className="flex min-h-[44px] items-center gap-3">
        <input
          type="checkbox"
          checked={recurrencia !== null}
          onChange={(e) =>
            setRecurrencia(
              e.target.checked
                ? recurrenciaNueva(getDay(parseISODate(fecha ?? fechaInicial)))
                : null,
            )
          }
          className="h-4 w-4 accent-[var(--pm-text)]"
        />
        <span className="text-body">Se repite</span>
      </label>

      {recurrencia && <RecurrenceEditor value={recurrencia} onChange={setRecurrencia} />}

      {existente?.recurrencia && fechaOcurrencia && (
        <button
          type="button"
          onClick={() => void cancelarOcurrencia()}
          className="flex min-h-[44px] items-center text-body underline"
        >
          Cancelar solo el {formatFechaCorta(fechaOcurrencia)}
        </button>
      )}

      <FormActions
        error={error}
        onGuardar={() => void guardar()}
        {...(existente
          ? {
              onEliminar: () => void deleteCompromiso(existente.id).then(onClose),
              tituloEliminar: `¿Eliminar ${existente.titulo}?`,
              detalleEliminar: existente.recurrencia
                ? 'Se elimina la serie completa, en todas sus fechas.'
                : undefined,
              labelEliminar: existente.recurrencia ? 'Eliminar toda la serie' : 'Eliminar',
            }
          : {})}
      />
    </div>
  )
}

/** Drop the optional keys that came out undefined instead of storing them. */
function limpiar<T extends object>(campos: T): T {
  return Object.fromEntries(
    Object.entries(campos).filter(([, valor]) => valor !== undefined),
  ) as T
}
