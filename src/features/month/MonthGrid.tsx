import { isSameMonth } from 'date-fns'
import { courseColorVar } from '../../design/palette'
import { toISODate, type ISODate } from '../../lib/date'
import type { DatedItem } from '../../model/types'
import {
  MAX_BARRAS,
  alturaBarraPx,
  separacionBarrasPx,
  tieneImportanciaAlta,
} from '../../logic/monthItems'

/** Monday first, the way a Chilean calendar reads. */
const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/**
 * The whole month on one screen, no vertical scroll: the rows share the
 * available height, so 5 and 6 week months both fit.
 *
 * This component knows nothing about evaluaciones or compromisos — it draws
 * DatedItems.
 */
export function MonthGrid({
  dias,
  mes,
  hoy,
  itemsPorFecha,
  onSelectDay,
}: {
  dias: Date[]
  mes: Date
  hoy: ISODate
  itemsPorFecha: Map<ISODate, DatedItem[]>
  onSelectDay: (fecha: ISODate) => void
}) {
  const filas = dias.length / 7

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 grid-cols-7">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i} className="py-1 text-center text-meta text-ink-tertiary">
            {label}
          </span>
        ))}
      </div>

      <div
        className="grid min-h-0 flex-1 border-t border-l border-border-hairline"
        style={{ gridTemplateRows: `repeat(${filas}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: filas }, (_, fila) => (
          <div key={fila} className="grid min-h-0 grid-cols-7">
            {dias.slice(fila * 7, fila * 7 + 7).map((dia) => {
              const fecha = toISODate(dia)
              return (
                <DayCell
                  key={fecha}
                  fecha={fecha}
                  numero={dia.getDate()}
                  delMes={isSameMonth(dia, mes)}
                  esHoy={fecha === hoy}
                  items={itemsPorFecha.get(fecha) ?? []}
                  onSelect={onSelectDay}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function DayCell({
  fecha,
  numero,
  delMes,
  esHoy,
  items,
  onSelect,
}: {
  fecha: ISODate
  numero: number
  delMes: boolean
  esHoy: boolean
  items: DatedItem[]
  onSelect: (fecha: ISODate) => void
}) {
  // Red is the day number and nothing else: never a bar, never a border.
  const alta = tieneImportanciaAlta(items)
  const visibles = items.slice(0, MAX_BARRAS)

  return (
    <button
      type="button"
      onClick={() => onSelect(fecha)}
      aria-label={`Día ${numero}`}
      className={`flex min-h-0 min-w-0 flex-col items-stretch overflow-hidden border-r border-b border-border-hairline px-1 pt-1 text-left ${
        esHoy ? 'bg-surface-muted' : ''
      }`}
    >
      <span
        className={`text-meta leading-none ${
          alta
            ? 'font-bold text-importance'
            : delMes
              ? 'text-ink-secondary'
              : 'text-ink-tertiary'
        }`}
      >
        {numero}
      </span>

      {/* Thickness carries importance, and the whole stack thins as the day
          fills up: a loaded day reads as denser, not as a taller cell. */}
      <span
        className="mt-1 flex min-h-0 flex-col"
        style={{ gap: separacionBarrasPx(visibles.length) }}
      >
        {visibles.map((item) => (
          <span
            key={item.id}
            className="block shrink-0 rounded-bar"
            style={{
              height: alturaBarraPx(item.importancia, visibles.length),
              background: courseColorVar(item.color),
              // Reduced weight, not hidden: routine still takes up your day.
              opacity: item.esRecurrente ? 'var(--pm-recurring-alpha)' : delMes ? 1 : 0.5,
            }}
          />
        ))}
      </span>
    </button>
  )
}
