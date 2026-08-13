import { Pressable, Text, View } from 'react-native'
import { courseColor, type ColorToken } from '../design/palette'
import { TOKENS } from '../design/tokens'

/**
 * A chip that carries a color stripe: pick a ramo, pick an evaluación. The
 * stripe is the same mark the month grid uses, so the color means the same
 * thing in both places.
 */
export function ColorChip({
  label,
  detalle,
  color,
  activo,
  onPress,
}: {
  label: string
  detalle?: string
  color?: ColorToken
  activo: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: activo }}
      onPress={onPress}
      className={`min-h-[44px] flex-row items-center gap-2 rounded-card border px-3 ${
        activo ? 'border-ink' : 'border-border-strong'
      }`}
    >
      <View
        className="h-4 w-1 rounded-bar"
        style={{ backgroundColor: color ? courseColor(color) : TOKENS.borderStrong }}
      />
      <Text className={`text-meta ${activo ? 'text-ink' : 'text-ink-secondary'}`}>{label}</Text>
      {detalle && <Text className="text-meta text-ink-tertiary">{detalle}</Text>}
    </Pressable>
  )
}
