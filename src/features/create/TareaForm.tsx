import { useState } from 'react'
import { DateInput } from '../../components/DateInput'
import { courseColorVar } from '../../design/palette'
import { formatFechaCorta } from '../../lib/dateInput'
import { usePlannerStore } from '../../store/usePlannerStore'
import { ramoById } from '../../store/selectors'
import type { ISODate, Tarea } from '../../model/types'
import { CampoTitulo, FormActions } from './FormPieces'

/** Tasks are the loosest thing in the model: no date and no evaluación is fine. */
export function TareaForm({
  fecha: fechaInicial,
  existente,
  onClose,
}: {
  fecha: ISODate
  existente?: Tarea
  onClose: () => void
}) {
  const data = usePlannerStore((s) => s.data)
  const createTarea = usePlannerStore((s) => s.createTarea)
  const updateTarea = usePlannerStore((s) => s.updateTarea)
  const deleteTarea = usePlannerStore((s) => s.deleteTarea)

  const [titulo, setTitulo] = useState(existente?.titulo ?? '')
  const [fecha, setFecha] = useState<ISODate | null>(existente?.fecha ?? fechaInicial)
  const [evaluacionId, setEvaluacionId] = useState(existente?.evaluacionId ?? '')
  const [error, setError] = useState<string | null>(null)

  // Only upcoming evaluaciones of live ramos: nobody hangs a task off a past one.
  const candidatas = data.evaluaciones
    .filter((e) => ramoById(data, e.ramoId)?.archivado === false)
    .filter((e) => e.fecha >= (fecha ?? fechaInicial) || e.id === evaluacionId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 8)

  async function guardar() {
    if (titulo.trim() === '') return setError('Ponele un título.')

    const campos = {
      titulo: titulo.trim(),
      hecha: existente?.hecha ?? false,
      ...(fecha ? { fecha } : {}),
      ...(evaluacionId ? { evaluacionId } : {}),
    }
    const ok = existente
      ? await updateTarea(existente.id, {
          ...campos,
          ...(fecha ? {} : { fecha: undefined }),
          ...(evaluacionId ? {} : { evaluacionId: undefined }),
        })
      : (await createTarea(campos)) !== null
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
        placeholder="¿Qué hay que hacer?"
        autoFocus={!existente}
      />

      <DateInput
        label="Fecha (opcional)"
        opcional
        value={fecha}
        onChange={setFecha}
        placeholder="sin fecha"
      />

      {candidatas.length > 0 && (
        <div>
          <p className="text-meta text-ink-tertiary">¿Es para alguna evaluación?</p>
          <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label="Evaluación">
            {candidatas.map((evaluacion) => {
              const ramo = ramoById(data, evaluacion.ramoId)
              const activo = evaluacion.id === evaluacionId
              return (
                <button
                  key={evaluacion.id}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => setEvaluacionId(activo ? '' : evaluacion.id)}
                  className={`flex min-h-[44px] items-center gap-2 rounded-card border px-3 text-meta ${
                    activo ? 'border-ink' : 'border-border-strong text-ink-secondary'
                  }`}
                >
                  <span
                    className="h-4 w-1 rounded-bar"
                    style={{
                      background: ramo ? courseColorVar(ramo.color) : 'var(--pm-border-strong)',
                    }}
                  />
                  {evaluacion.titulo}
                  <span className="text-ink-tertiary">{formatFechaCorta(evaluacion.fecha)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <FormActions
        error={error}
        onGuardar={() => void guardar()}
        {...(existente
          ? {
              onEliminar: () => void deleteTarea(existente.id).then(onClose),
              tituloEliminar: `¿Eliminar ${existente.titulo}?`,
            }
          : {})}
      />
    </div>
  )
}
