import { Pressable, Text, View } from 'react-native'
import { buildSeedDataset } from '../../dev/seed'
import { usePlannerStore } from '../../store/usePlannerStore'
import { emptyDataset } from '../../model/types'

/**
 * The fixture and the wipe, as buttons. On the web these lived on
 * `window.plannermi`; a phone has no console to type into, and checking a
 * change against a full month should not cost twenty minutes of data entry.
 *
 * Rendered only when `__DEV__`, so it never ships in a release build.
 */
export function DevTools() {
  const replaceAll = usePlannerStore((s) => s.replaceAll)

  if (!__DEV__) return null

  return (
    <View className="mt-10 border-t border-border-hairline pt-4">
      <Text className="text-meta text-ink-tertiary">Desarrollo</Text>

      <View className="mt-2 flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          onPress={() => void replaceAll(buildSeedDataset())}
          className="min-h-[44px] flex-1 items-center justify-center rounded-card border border-border-strong"
        >
          <Text className="text-meta text-ink">Cargar datos de prueba</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => void replaceAll(emptyDataset())}
          className="min-h-[44px] flex-1 items-center justify-center rounded-card border border-border-strong"
        >
          <Text className="text-meta text-ink">Vaciar la base</Text>
        </Pressable>
      </View>
    </View>
  )
}
