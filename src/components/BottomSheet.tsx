import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SHADOW_FLOAT } from '../design/tokens'

/** One of the two things in the app that really floats, so it gets a shadow. */
export function BottomSheet({
  titulo,
  onClose,
  children,
}: {
  titulo: string
  onClose: () => void
  children: React.ReactNode
}) {
  const insets = useSafeAreaInsets()

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      statusBarTranslucent
      // Android's back button closes the sheet, not the screen behind it.
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* The scrim is the only place a raw color is allowed: it is not a
            token, it is the absence of the sheet. */}
        <Pressable
          className="flex-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
          onPress={onClose}
          accessibilityLabel="Cerrar"
        />

        <View
          accessibilityViewIsModal
          accessibilityLabel={titulo}
          style={[SHADOW_FLOAT, { maxHeight: '80%', paddingBottom: Math.max(16, insets.bottom) }]}
          className="rounded-t-[16px] bg-surface-raised px-4"
        >
          <View className="bg-surface-raised pb-2 pt-3">
            <View className="mx-auto mb-3 h-1 w-9 rounded-bar bg-border-strong" />
            <Text className="text-body font-bold text-ink">{titulo}</Text>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" className="grow-0">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
