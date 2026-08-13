import { Pressable, Text, View } from 'react-native'

/** Single-choice chips. Gray, like everything that is not data. */
export function ChipGroup<T extends string>({
  value,
  options,
  labels,
  onChange,
  label,
}: {
  value: T
  options: readonly T[]
  labels: Record<T, string>
  onChange: (value: T) => void
  label: string
}) {
  return (
    <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((option) => {
        const activo = option === value
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: activo }}
            onPress={() => onChange(option)}
            className={`min-h-[44px] justify-center rounded-card border px-3 ${
              activo ? 'border-ink bg-accent' : 'border-border-strong'
            }`}
          >
            <Text className={`text-meta ${activo ? 'text-on-accent' : 'text-ink-secondary'}`}>
              {labels[option]}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
