import { Text, TextInput, View } from 'react-native'
import { parseHoraCorta } from '../lib/time'
import { TOKENS } from '../design/tokens'
import type { HoraHHMM } from '../lib/date'

/** Same idea as DateInput: "19", "19:30" and "1930" all work. */
export function TimeInput({
  value,
  onChange,
  label,
  placeholder = '19:30',
}: {
  value: string
  onChange: (texto: string, hora: HoraHHMM | null) => void
  label: string
  placeholder?: string
}) {
  const vacio = value.trim() === ''
  const error = !vacio && parseHoraCorta(value) === null

  return (
    <View>
      <Text className="text-meta text-ink-tertiary">{label}</Text>
      <TextInput
        value={value}
        inputMode="numeric"
        placeholder={placeholder}
        placeholderTextColor={TOKENS.inkTertiary}
        accessibilityLabel={label}
        onChangeText={(texto) => onChange(texto, parseHoraCorta(texto))}
        className={`min-h-[44px] w-20 border-b border-border-hairline text-body ${
          error ? 'text-importance' : 'text-ink'
        }`}
      />
    </View>
  )
}
