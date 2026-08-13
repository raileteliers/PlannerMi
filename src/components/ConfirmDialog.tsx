import { Modal, Pressable, Text, View } from 'react-native'
import { SHADOW_FLOAT } from '../design/tokens'

/**
 * Used for deletes, where the message carries the concrete numbers
 * ("Se eliminarán 3 evaluaciones y 7 tareas").
 */
export function ConfirmDialog({
  titulo,
  detalle,
  confirmLabel = 'Eliminar',
  onConfirm,
  onCancel,
}: {
  titulo: string
  detalle?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable
        className="flex-1 items-center justify-end p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
        onPress={onCancel}
      >
        <Pressable
          accessibilityViewIsModal
          accessibilityLabel={titulo}
          // Swallows the tap so it does not reach the scrim behind.
          onPress={() => {}}
          style={SHADOW_FLOAT}
          className="w-full rounded-card bg-surface-raised p-4"
        >
          <Text className="text-body font-bold text-ink">{titulo}</Text>
          {detalle && <Text className="mt-2 text-body text-ink-secondary">{detalle}</Text>}

          <View className="mt-6 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              className="min-h-[44px] flex-1 items-center justify-center rounded-card border border-border-strong"
            >
              <Text className="text-body text-ink">Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              className="min-h-[44px] flex-1 items-center justify-center rounded-card bg-importance"
            >
              <Text className="text-body font-bold text-on-accent">{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
