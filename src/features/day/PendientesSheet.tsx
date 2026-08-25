import { Pressable, Text, View } from 'react-native'
import { BottomSheet } from '../../components/BottomSheet'
import { Checkbox } from '../../components/Checkbox'
import { usePlannerStore } from '../../store/usePlannerStore'
import type { Tarea } from '../../model/types'
import type { PedidoAgendar } from './TodayStrip'

/**
 * The day's to-do list, given its own sheet.
 *
 * It used to live inline above the timeline, where a long list pushed the
 * hours off the screen — and the hours are what the day screen is for. Here
 * the list can be as long as it needs to be.
 */
export function PendientesSheet({
  tareas,
  onAgendar,
  onClose,
}: {
  tareas: Tarea[]
  onAgendar: (pedido: PedidoAgendar) => void
  onClose: () => void
}) {
  const updateTarea = usePlannerStore((s) => s.updateTarea)

  return (
    <BottomSheet titulo="Pendientes" onClose={onClose}>
      <View className="pb-2">
        {tareas.map((tarea) => (
          <View key={tarea.id} className="min-h-[44px] flex-row items-center gap-2">
            <Checkbox
              label={tarea.titulo}
              checked={tarea.hecha}
              onChange={(hecha) => void updateTarea(tarea.id, { hecha })}
            />
            <Text
              numberOfLines={1}
              className={`flex-1 text-body ${
                tarea.hecha ? 'text-ink-tertiary line-through' : 'text-ink'
              }`}
            >
              {tarea.titulo}
            </Text>
            {!tarea.hecha && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Agendar ${tarea.titulo}`}
                // Closing first: two sheets on top of each other is two things
                // floating, and only one thing floats at a time.
                onPress={() => {
                  onClose()
                  onAgendar({ titulo: tarea.titulo, ref: { tipo: 'tarea', id: tarea.id } })
                }}
                className="min-h-[44px] justify-center rounded-card border border-border-strong px-3"
              >
                <Text className="text-meta text-ink">Agendar</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </BottomSheet>
  )
}
