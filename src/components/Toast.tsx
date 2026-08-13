import { useEffect } from 'react'
import { Pressable, Text } from 'react-native'
import { usePlannerStore } from '../store/usePlannerStore'
import { SHADOW_FLOAT } from '../design/tokens'

const VISIBLE_MS = 4000

/**
 * The only transient message in the app: a write failed and the screen was
 * rolled back to what is actually saved.
 *
 * It is a button — tapping dismisses it — and it carries the neutral accent.
 * A red toast would spend the one color that means importance.
 */
export function Toast() {
  const mensaje = usePlannerStore((s) => s.writeError)
  const descartar = usePlannerStore((s) => s.dismissWriteError)

  useEffect(() => {
    if (!mensaje) return
    const id = setTimeout(descartar, VISIBLE_MS)
    return () => clearTimeout(id)
  }, [mensaje, descartar])

  if (!mensaje) return null

  return (
    <Pressable
      onPress={descartar}
      accessibilityRole="button"
      accessibilityLiveRegion="polite"
      style={SHADOW_FLOAT}
      className="absolute bottom-4 left-4 z-40 min-h-[44px] justify-center rounded-card bg-accent px-4"
    >
      <Text className="text-body text-on-accent">{mensaje}</Text>
    </Pressable>
  )
}
