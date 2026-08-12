import { useState } from 'react'
import { Link } from 'react-router'
import { ChipGroup } from '../../components/ChipGroup'
import { DateInput } from '../../components/DateInput'
import { courseColorVar } from '../../design/palette'
import { IMPORTANCIA_LABEL, TIPO_LABEL } from '../../design/labels'
import { usePlannerStore } from '../../store/usePlannerStore'
import { ramosActivos } from '../../store/selectors'
import {
  IMPORTANCIAS,
  TIPOS_EVALUACION,
  type Evaluacion,
  type ISODate,
} from '../../model/types'
import { CampoTitulo, FormActions } from './FormPieces'

export function EvaluacionForm({
  fecha: fechaInicial,
  existente,
  onClose,
}: {
  fecha: ISODate
  existente?: Evaluacion
  onClose: () => void
}) {
  const data = usePlannerStore((s) => s.data)
  const createEvaluacion = usePlannerStore((s) => s.createEvaluacion)
  const updateEvaluacion = usePlannerStore((s) => s.updateEvaluacion)
  const deleteEvaluacion = usePlannerStore((s) => s.deleteEvaluacion)
  const planDeleteEvaluacion = usePlannerStore((s) => s.planDeleteEvaluacion)

  const ramos = ramosActivos(data)
  const [ramoId, setRamoId] = useState(existente?.ramoId ?? ramos[0]?.id ?? '')
  const [titulo, setTitulo] = useState(existente?.titulo ?? '')
  const [fecha, setFecha] = useState<ISODate | null>(existente?.fecha ?? fechaInicial)
  const [tipo, setTipo] = useState<Evaluacion['tipo']>(existente?.tipo ?? 'prueba')
  const [importancia, setImportancia] = useState(existente?.importancia ?? 'media')
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? '')
  const [error, setError] = useState<string | null>(null)

  if (ramos.length === 0) {
    return (
      <div className="py-4">
        <p className="text-body text-ink-secondary">
          Una evaluación va en un ramo, y todavía no tenés ninguno.
        </p>
        <Link
          to="/ramos"
          onClick={onClose}
          className="mt-4 flex min-h-[44px] items-center text-body underline"
        >
          Crear un ramo
        </Link>
      </div>
    )
  }

  async function guardar() {
    if (titulo.trim() === '') return setError('Ponele un título.')
    if (!fecha) return setError('Revisá la fecha.')

    const campos = {
      ramoId,
      titulo: titulo.trim(),
      fecha,
      tipo,
      importancia,
      ...(descripcion.trim() === '' ? {} : { descripcion: descripcion.trim() }),
    }
    const ok = existente
      ? await updateEvaluacion(existente.id, {
          ...campos,
          ...(descripcion.trim() === '' ? { descripcion: undefined } : {}),
        })
      : (await createEvaluacion(campos)) !== null
    if (ok) onClose()
  }

  return (
    <div className="flex flex-col gap-3 pt-1 pb-2">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ramo">
        {ramos.map((ramo) => {
          const activo = ramo.id === ramoId
          return (
            <button
              key={ramo.id}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => setRamoId(ramo.id)}
              className={`flex min-h-[44px] items-center gap-2 rounded-card border px-3 text-meta ${
                activo ? 'border-ink' : 'border-border-strong text-ink-secondary'
              }`}
            >
              <span
                className="h-4 w-1 rounded-bar"
                style={{ background: courseColorVar(ramo.color) }}
              />
              {ramo.sigla ?? ramo.nombre}
            </button>
          )
        })}
      </div>

      <CampoTitulo
        value={titulo}
        onChange={(v) => {
          setTitulo(v)
          setError(null)
        }}
        placeholder="Prueba 1, Entrega final…"
        autoFocus={!existente}
      />

      <DateInput label="Fecha" value={fecha} onChange={setFecha} />

      <ChipGroup
        label="Tipo"
        value={tipo}
        options={TIPOS_EVALUACION}
        labels={TIPO_LABEL}
        onChange={setTipo}
      />
      <ChipGroup
        label="Importancia"
        value={importancia}
        options={IMPORTANCIAS}
        labels={IMPORTANCIA_LABEL}
        onChange={setImportancia}
      />

      <input
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción (opcional)"
        aria-label="Descripción"
        className="min-h-[44px] border-b border-border-hairline text-body outline-none placeholder:text-ink-tertiary"
      />

      <FormActions
        error={error}
        onGuardar={() => void guardar()}
        {...(existente
          ? {
              onEliminar: () => void deleteEvaluacion(existente.id).then(onClose),
              tituloEliminar: `¿Eliminar ${existente.titulo}?`,
              detalleEliminar: detalleTareas(planDeleteEvaluacion(existente.id).tareaIds.length),
            }
          : {})}
      />
    </div>
  )
}

const detalleTareas = (tareas: number): string =>
  tareas === 0
    ? 'No tiene tareas.'
    : `Se eliminan también ${tareas === 1 ? 'su tarea' : `sus ${tareas} tareas`}.`
