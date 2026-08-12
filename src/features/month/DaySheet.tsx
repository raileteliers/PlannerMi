import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate } from 'react-router'
import { BottomSheet } from '../../components/BottomSheet'
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  courseColorVar,
  type ColorToken,
} from '../../design/palette'
import { TIPO_LABEL } from '../../design/labels'
import { parseISODate, type ISODate } from '../../lib/date'
import { expandCompromiso } from '../../logic/recurrence'
import { tareasDelDia } from '../../logic/monthItems'
import { usePlannerStore } from '../../store/usePlannerStore'
import { ramoById } from '../../store/selectors'
import { EvaluacionForm } from '../create/EvaluacionForm'
import { CompromisoForm } from '../create/CompromisoForm'
import { TareaForm } from '../create/TareaForm'
import type { Compromiso, Evaluacion, Tarea } from '../../model/types'

const TITULO_EDITAR = {
  evaluacion: 'Editar evaluación',
  compromiso: 'Editar compromiso',
  tarea: 'Editar tarea',
} as const

type Editando =
  | { tipo: 'evaluacion'; entidad: Evaluacion }
  | { tipo: 'compromiso'; entidad: Compromiso }
  | { tipo: 'tarea'; entidad: Tarea }

/** What that day holds, and the way into organizing it. */
export function DaySheet({ fecha, onClose }: { fecha: ISODate; onClose: () => void }) {
  const data = usePlannerStore((s) => s.data)
  const updateTarea = usePlannerStore((s) => s.updateTarea)
  const navigate = useNavigate()
  const [editando, setEditando] = useState<Editando | null>(null)

  const evaluaciones = data.evaluaciones
    .filter((e) => e.fecha === fecha && ramoById(data, e.ramoId)?.archivado === false)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'))

  const compromisos = data.compromisos
    .filter((c) => expandCompromiso(c, { desde: fecha, hasta: fecha }).length > 0)
    .sort((a, b) => (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99'))

  const tareas = tareasDelDia(data, fecha)
  const vacio = evaluaciones.length === 0 && compromisos.length === 0 && tareas.length === 0
  const titulo = format(parseISODate(fecha), "EEEE d 'de' MMMM", { locale: es })

  // Editing replaces the list inside the same sheet: a sheet on top of a
  // sheet is two things floating, and only one thing floats at a time.
  if (editando) {
    return (
      <BottomSheet titulo={TITULO_EDITAR[editando.tipo]} onClose={() => setEditando(null)}>
        {editando.tipo === 'evaluacion' && (
          <EvaluacionForm
            fecha={fecha}
            existente={editando.entidad}
            onClose={() => setEditando(null)}
          />
        )}
        {editando.tipo === 'compromiso' && (
          <CompromisoForm
            fecha={fecha}
            existente={editando.entidad}
            fechaOcurrencia={fecha}
            onClose={() => setEditando(null)}
          />
        )}
        {editando.tipo === 'tarea' && (
          <TareaForm
            fecha={fecha}
            existente={editando.entidad}
            onClose={() => setEditando(null)}
          />
        )}
      </BottomSheet>
    )
  }

  return (
    <BottomSheet titulo={titulo} onClose={onClose}>
      {vacio ? (
        <p className="py-4 text-body text-ink-secondary">No tenés nada ese día.</p>
      ) : (
        <ul className="pb-2">
          {evaluaciones.map((evaluacion) => {
            const ramo = ramoById(data, evaluacion.ramoId)
            return (
              <Fila
                key={evaluacion.id}
                color={ramo?.color}
                titulo={evaluacion.titulo}
                alta={evaluacion.importancia === 'alta'}
                detalle={[ramo?.nombre, TIPO_LABEL[evaluacion.tipo]]
                  .filter(Boolean)
                  .join(' · ')}
                onEditar={() => setEditando({ tipo: 'evaluacion', entidad: evaluacion })}
              />
            )
          })}

          {compromisos.map((compromiso) => (
            <Fila
              key={compromiso.id}
              color={CATEGORY_COLOR[compromiso.categoria]}
              titulo={compromiso.titulo}
              alta={compromiso.importancia === 'alta'}
              tenue={compromiso.recurrencia !== undefined}
              detalle={[compromiso.hora, CATEGORY_LABEL[compromiso.categoria]]
                .filter(Boolean)
                .join(' · ')}
              onEditar={() => setEditando({ tipo: 'compromiso', entidad: compromiso })}
            />
          ))}

          {tareas.map((tarea) => (
            <li key={tarea.id} className="flex items-center gap-2">
              <label className="flex min-h-[44px] items-center">
                <input
                  type="checkbox"
                  checked={tarea.hecha}
                  onChange={(e) => void updateTarea(tarea.id, { hecha: e.target.checked })}
                  aria-label={tarea.titulo}
                  className="h-4 w-4 accent-[var(--pm-text)]"
                />
              </label>
              <button
                type="button"
                onClick={() => setEditando({ tipo: 'tarea', entidad: tarea })}
                className="flex min-h-[44px] min-w-0 flex-1 items-center text-left"
              >
                <span
                  className={`truncate text-body ${tarea.hecha ? 'text-ink-tertiary line-through' : ''}`}
                >
                  {tarea.titulo}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => void navigate(`/dia/${fecha}`)}
        className="mt-2 min-h-[44px] w-full rounded-card bg-accent text-body text-on-accent"
      >
        Organizar día
      </button>
    </BottomSheet>
  )
}

function Fila({
  color,
  titulo,
  detalle,
  alta = false,
  tenue = false,
  onEditar,
}: {
  color?: ColorToken
  titulo: string
  detalle: string
  alta?: boolean
  tenue?: boolean
  onEditar: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onEditar}
        className="flex min-h-[44px] w-full items-center gap-3 text-left"
      >
        <span
          className="h-6 w-1 shrink-0 rounded-bar"
          style={{
            background: color ? courseColorVar(color) : 'var(--pm-border-strong)',
            opacity: tenue ? 'var(--pm-recurring-alpha)' : 1,
          }}
        />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-body ${alta ? 'font-bold text-importance' : ''}`}>
            {titulo}
          </span>
          {detalle && <span className="block text-meta text-ink-tertiary">{detalle}</span>}
        </span>
      </button>
    </li>
  )
}
