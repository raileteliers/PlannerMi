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
import { parseISODate, type ISODate } from '../../lib/date'
import { expandCompromiso } from '../../logic/recurrence'
import { tareasDelDia } from '../../logic/monthItems'
import { usePlannerStore } from '../../store/usePlannerStore'
import { ramoById } from '../../store/selectors'

const TIPO_LABEL: Record<string, string> = {
  prueba: 'Prueba',
  control: 'Control',
  entrega: 'Entrega',
  examen: 'Examen',
}

/** What that day holds, and the way into organizing it. */
export function DaySheet({ fecha, onClose }: { fecha: ISODate; onClose: () => void }) {
  const data = usePlannerStore((s) => s.data)
  const updateTarea = usePlannerStore((s) => s.updateTarea)
  const navigate = useNavigate()

  const evaluaciones = data.evaluaciones
    .filter((e) => e.fecha === fecha && ramoById(data, e.ramoId)?.archivado === false)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'))

  const compromisos = data.compromisos
    .filter((c) => expandCompromiso(c, { desde: fecha, hasta: fecha }).length > 0)
    .sort((a, b) => (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99'))

  const tareas = tareasDelDia(data, fecha)
  const vacio = evaluaciones.length === 0 && compromisos.length === 0 && tareas.length === 0

  return (
    <BottomSheet titulo={format(parseISODate(fecha), "EEEE d 'de' MMMM", { locale: es })} onClose={onClose}>
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
            />
          ))}

          {tareas.map((tarea) => (
            <li key={tarea.id}>
              <label className="flex min-h-[44px] items-center gap-3">
                <input
                  type="checkbox"
                  checked={tarea.hecha}
                  onChange={(e) => void updateTarea(tarea.id, { hecha: e.target.checked })}
                  className="h-4 w-4 accent-[var(--pm-text)]"
                />
                <span
                  className={`text-body ${tarea.hecha ? 'text-ink-tertiary line-through' : ''}`}
                >
                  {tarea.titulo}
                </span>
              </label>
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
}: {
  color?: ColorToken
  titulo: string
  detalle: string
  alta?: boolean
  tenue?: boolean
}) {
  return (
    <li className="flex min-h-[44px] items-center gap-3">
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
    </li>
  )
}
