import { CATEGORY_COLOR, CATEGORY_LABEL, courseColorVar } from '../../design/palette'
import type { FranjaSuperior } from '../../logic/dayTimeline'
import { usePlannerStore } from '../../store/usePlannerStore'
import { ramoById } from '../../store/selectors'
import type { RefTipo } from '../../model/types'

export interface PedidoAgendar {
  titulo: string
  ref: { tipo: RefTipo; id: string }
}

/**
 * The *what* half of the day: everything with no hour of its own. Every row
 * offers "Agendar", which is how something without a time gets one.
 */
export function TodayStrip({
  franja,
  onAgendar,
}: {
  franja: FranjaSuperior
  onAgendar: (pedido: PedidoAgendar) => void
}) {
  const data = usePlannerStore((s) => s.data)
  const updateTarea = usePlannerStore((s) => s.updateTarea)

  return (
    <ul className="shrink-0 border-b border-border-hairline pb-2">
      {franja.evaluaciones.map((evaluacion) => {
        const ramo = ramoById(data, evaluacion.ramoId)
        return (
          <Fila
            key={evaluacion.id}
            color={ramo ? courseColorVar(ramo.color) : undefined}
            titulo={evaluacion.titulo}
            alta={evaluacion.importancia === 'alta'}
            detalle={ramo?.nombre}
            onAgendar={() =>
              onAgendar({
                titulo: evaluacion.titulo,
                ref: { tipo: 'evaluacion', id: evaluacion.id },
              })
            }
          />
        )
      })}

      {franja.compromisosSinHora.map((compromiso) => (
        <Fila
          key={compromiso.id}
          color={courseColorVar(CATEGORY_COLOR[compromiso.categoria])}
          tenue={compromiso.recurrencia !== undefined}
          titulo={compromiso.titulo}
          alta={compromiso.importancia === 'alta'}
          detalle={CATEGORY_LABEL[compromiso.categoria]}
          onAgendar={() =>
            onAgendar({
              titulo: compromiso.titulo,
              ref: { tipo: 'compromiso', id: compromiso.id },
            })
          }
        />
      ))}

      {franja.tareas.map((tarea) => (
        <li key={tarea.id} className="flex items-center gap-2">
          {/* 44px target around a 16px box. */}
          <label className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 pl-1">
            <input
              type="checkbox"
              checked={tarea.hecha}
              onChange={(e) => void updateTarea(tarea.id, { hecha: e.target.checked })}
              className="h-4 w-4 accent-[var(--pm-text)]"
            />
            <span
              className={`truncate text-body ${tarea.hecha ? 'text-ink-tertiary line-through' : ''}`}
            >
              {tarea.titulo}
            </span>
          </label>
          {!tarea.hecha && (
            <BotonAgendar
              onClick={() =>
                onAgendar({ titulo: tarea.titulo, ref: { tipo: 'tarea', id: tarea.id } })
              }
            />
          )}
        </li>
      ))}
    </ul>
  )
}

function Fila({
  color,
  titulo,
  detalle,
  alta = false,
  tenue = false,
  onAgendar,
}: {
  color?: string
  titulo: string
  detalle?: string
  alta?: boolean
  tenue?: boolean
  onAgendar: () => void
}) {
  return (
    <li className="flex min-h-[44px] items-center gap-3">
      <span
        className="h-6 w-1 shrink-0 rounded-bar"
        style={{ background: color ?? 'var(--pm-border-strong)', opacity: tenue ? 0.35 : 1 }}
      />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-body ${alta ? 'font-bold text-importance' : ''}`}>
          {titulo}
        </span>
        {detalle && <span className="block text-meta text-ink-tertiary">{detalle}</span>}
      </span>
      <BotonAgendar onClick={onAgendar} />
    </li>
  )
}

const BotonAgendar = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="min-h-[44px] shrink-0 rounded-card border border-border-strong px-3 text-meta"
  >
    Agendar
  </button>
)
