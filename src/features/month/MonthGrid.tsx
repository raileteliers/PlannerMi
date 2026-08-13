import { isSameMonth } from 'date-fns'
import { Pressable, Text, View } from 'react-native'
import { courseColor } from '../../design/palette'
import { RECURRING_ALPHA } from '../../design/tokens'
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
    <View className="flex-1">
      <View className="flex-row">
        {WEEKDAY_LABELS.map((label, i) => (
          <Text
            key={i}
            className="flex-1 py-1 text-center text-meta text-ink-tertiary"
          >
            {label}
          </Text>
        ))}
      </View>

      <View className="flex-1 border-l border-t border-border-hairline">
        {Array.from({ length: filas }, (_, fila) => (
          <View key={fila} className="flex-1 flex-row">
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
          </View>
        ))}
      </View>
    </View>
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Día ${numero}`}
      onPress={() => onSelect(fecha)}
      className={`flex-1 overflow-hidden border-b border-r border-border-hairline px-1 pt-1 ${
        esHoy ? 'bg-surface-muted' : ''
      }`}
    >
      <Text
        className={`text-meta ${
          alta
            ? 'font-bold text-importance'
            : delMes
              ? 'text-ink-secondary'
              : 'text-ink-tertiary'
        }`}
      >
        {numero}
      </Text>

      {/* Thickness carries importance, and the whole stack thins as the day
          fills up: a loaded day reads as denser, not as a taller cell. */}
      <View className="mt-1" style={{ gap: separacionBarrasPx(visibles.length) }}>
        {visibles.map((item) => (
          <View
            key={item.id}
            className="rounded-bar"
            style={{
              height: alturaBarraPx(item.importancia, visibles.length),
              backgroundColor: courseColor(item.color),
              // Reduced weight, not hidden: routine still takes up your day.
              opacity: item.esRecurrente ? RECURRING_ALPHA : delMes ? 1 : 0.5,
            }}
          />
        ))}
      </View>
    </Pressable>
  )
}
