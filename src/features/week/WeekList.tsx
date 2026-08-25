import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { Caret } from '../../components/Caret'
import { Checkbox } from '../../components/Checkbox'
import { courseColor } from '../../design/palette'
import { RECURRING_ALPHA } from '../../design/tokens'
import { parseISODate, type ISODate } from '../../lib/date'
import { SIN_FECHA_VISIBLES, diaVacio, type DiaDeSemana } from '../../logic/weekItems'
import { usePlannerStore } from '../../store/usePlannerStore'
import type { Tarea } from '../../model/types'

/**
 * The week as seven stacked days, each one carrying what is scheduled and
 * what there is to do.
 *
 * Rows rather than columns: seven columns on a phone are 50px wide, and a
 * task title in 50px is not a task title. On a wide screen the same rows are
 * laid side by side, which is where seven columns finally fit.
 */
export function WeekList({
  dias,
  sinFecha,
  hoy,
  enColumnas,
  onSelectDay,
  onEditarTarea,
}: {
  dias: DiaDeSemana[]
  sinFecha: Tarea[]
  hoy: ISODate
  enColumnas: boolean
  onSelectDay: (fecha: ISODate) => void
  onEditarTarea: (tarea: Tarea) => void
}) {
  // Above the seven days in both layouts: the strip belongs to the week, not
  // to any one day, and it is the pile you deal the week out of.
  const strip = <SinFechaStrip tareas={sinFecha} onEditar={onEditarTarea} />

  if (enColumnas) {
    return (
      <View className="min-h-0 flex-1">
        {strip}
        <View className="min-h-0 flex-1 flex-row border-l border-t border-border-hairline">
          {dias.map((dia) => (
            <View
              key={dia.fecha}
              className="min-w-0 flex-1 border-b border-r border-border-hairline"
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <DiaFila
                  dia={dia}
                  esHoy={dia.fecha === hoy}
                  angosto
                  onSelect={onSelectDay}
                  onEditarTarea={onEditarTarea}
                />
              </ScrollView>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <ScrollView className="min-h-0 flex-1" showsVerticalScrollIndicator={false}>
      {strip}
      {dias.map((dia) => (
        <View key={dia.fecha} className="border-b border-border-hairline">
          <DiaFila
            dia={dia}
            esHoy={dia.fecha === hoy}
            onSelect={onSelectDay}
            onEditarTarea={onEditarTarea}
          />
        </View>
      ))}
      {/* The FAB floats over this lane, so Sunday is never under it. */}
      <View className="h-14" />
    </ScrollView>
  )
}

/**
 * The undated tasks, folded to two.
 *
 * Folded rather than scrolling with the rest because this strip is not the
 * screen: a long pile of loose tasks would push Monday off the top every time
 * the week is opened, and the week is what you came to see.
 *
 * The mark to open it is the caret and not a "+": in this app the "+" is the
 * button that creates things, and it is floating on this very screen.
 */
function SinFechaStrip({
  tareas,
  onEditar,
}: {
  tareas: Tarea[]
  onEditar: (tarea: Tarea) => void
}) {
  const [abierto, setAbierto] = useState(false)

  // No empty box: with nothing loose there is nothing to say.
  if (tareas.length === 0) return null

  const visibles = abierto ? tareas : tareas.slice(0, SIN_FECHA_VISIBLES)
  const ocultas = tareas.length - visibles.length

  return (
    <View className="border-b border-border-hairline px-2 py-2">
      <Text className="text-meta uppercase text-ink-tertiary">Sin fecha</Text>

      {visibles.map((tarea) => (
        <TareaFila key={tarea.id} tarea={tarea} onEditar={onEditar} />
      ))}

      {(ocultas > 0 || abierto) && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: abierto }}
          onPress={() => setAbierto((v) => !v)}
          className="min-h-[36px] flex-row items-center gap-2 pl-2"
        >
          <Caret abierto={abierto} />
          <Text className="text-meta text-ink-tertiary">
            {abierto ? 'Ver menos' : `${ocultas} más`}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

function DiaFila({
  dia,
  esHoy,
  angosto = false,
  onSelect,
  onEditarTarea,
}: {
  dia: DiaDeSemana
  esHoy: boolean
  /** A column, not a row: there is no width to put an hour beside a title. */
  angosto?: boolean
  onSelect: (fecha: ISODate) => void
  onEditarTarea: (tarea: Tarea) => void
}) {
  const vacio = diaVacio(dia)

  return (
    <View className={`px-2 py-2 ${esHoy ? 'bg-surface-muted' : ''}`}>
      {/* The header is the way in: tapping the day opens it, which is also
          the only way to add something to an empty one. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={format(parseISODate(dia.fecha), "EEEE d 'de' MMMM", { locale: es })}
        onPress={() => onSelect(dia.fecha)}
        className="min-h-[32px] flex-row items-baseline gap-2"
      >
        <Text className={`text-meta uppercase ${esHoy ? 'font-bold text-ink' : 'text-ink-secondary'}`}>
          {format(parseISODate(dia.fecha), 'EEE d', { locale: es }).replace('.', '')}
        </Text>
        {/* One line, not two words sitting next to each other: "hoy libre"
            reads as a phrase that means neither of the two things it says. */}
        {(esHoy || (vacio && !angosto)) && (
          <Text className="text-meta text-ink-tertiary">
            {[esHoy ? 'hoy' : null, vacio && !angosto ? 'libre' : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}
      </Pressable>

      {dia.items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          onPress={() => onSelect(dia.fecha)}
          className="min-h-[28px] flex-row items-start gap-2 pl-1"
        >
          <View
            className="mt-1 h-4 w-1 rounded-bar"
            style={{
              backgroundColor: courseColor(item.color),
              // Reduced weight, not hidden: routine still takes up your day.
              opacity: item.esRecurrente ? RECURRING_ALPHA : 1,
            }}
          />
          <View className="min-w-0 flex-1">
            <Text
              numberOfLines={1}
              className={`text-meta ${
                item.importancia === 'alta' ? 'font-bold text-importance' : 'text-ink'
              }`}
            >
              {item.titulo}
            </Text>
            {/* In a column the hour goes under the title. Beside it, it wins
                the row and the title is squeezed down to nothing. */}
            {angosto && item.hora !== undefined && (
              <Text className="text-meta text-ink-tertiary">{item.hora}</Text>
            )}
          </View>
          {!angosto && item.hora !== undefined && (
            <Text className="shrink-0 text-meta text-ink-tertiary">{item.hora}</Text>
          )}
        </Pressable>
      ))}

      {dia.tareas.map((tarea) => (
        <TareaFila key={tarea.id} tarea={tarea} onEditar={onEditarTarea} />
      ))}
    </View>
  )
}

/**
 * The row is split in two, the way the day sheet splits it: the box closes the
 * task, the title opens it.
 *
 * Checking off is done right here rather than through the day sheet, because
 * reviewing the week and closing what is already done is one gesture. Opening
 * the title is what turns this screen from a list into a way of organizing:
 * a loose task gets its day in the form behind it.
 */
function TareaFila({ tarea, onEditar }: { tarea: Tarea; onEditar: (tarea: Tarea) => void }) {
  const updateTarea = usePlannerStore((s) => s.updateTarea)

  return (
    <View className="min-h-[36px] flex-row items-center">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: tarea.hecha }}
        accessibilityLabel={tarea.titulo}
        onPress={() => void updateTarea(tarea.id, { hecha: !tarea.hecha })}
        className="h-9 w-8 items-center justify-center overflow-hidden"
      >
        {/* The shared Checkbox is used for its drawing: its own 44px target is
            clipped, and this Pressable is the target instead. */}
        <View pointerEvents="none">
          <Checkbox checked={tarea.hecha} onChange={() => {}} label={tarea.titulo} />
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar ${tarea.titulo}`}
        onPress={() => onEditar(tarea)}
        className="h-9 min-w-0 flex-1 justify-center"
      >
        <Text
          numberOfLines={1}
          className={`text-meta ${
            tarea.hecha ? 'text-ink-tertiary line-through' : 'text-ink'
          }`}
        >
          {tarea.titulo}
        </Text>
      </Pressable>
    </View>
  )
}
