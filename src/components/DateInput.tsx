import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { formatFechaCorta, formatFechaEditable, parseFechaCorta } from '../lib/dateInput'
import { TOKENS } from '../design/tokens'
import type { ISODate } from '../lib/date'

/**
 * Dates are typed, not picked: "12/9" and done. Shows what it understood
 * underneath, and turns red on what it cannot read.
 *
 * The native date picker was never on the table — loading a semester is a
 * dozen dates in a row, and three taps each is the difference between doing
 * it and not doing it.
 */
export function DateInput({
  value,
  onChange,
  label,
  // Digits, no separator: the placeholder has to show something the Android
  // number pad can actually produce. "12/9" still parses on any other keyboard.
  placeholder = '1209',
  opcional = false,
}: {
  value: ISODate | null
  onChange: (fecha: ISODate | null) => void
  label: string
  placeholder?: string
  opcional?: boolean
}) {
  const [texto, setTexto] = useState(() => (value ? formatFechaEditable(value) : ''))
  const parseada = parseFechaCorta(texto)
  const vacio = texto.trim() === ''
  const error = !vacio && parseada === null

  return (
    <View>
      <Text className="text-meta text-ink-tertiary">{label}</Text>
      <TextInput
        value={texto}
        // "numeric" is a bare digit pad on Android — no way to type a separator
        // at all. "decimal" keeps the pad and adds the locale's decimal key.
        inputMode="decimal"
        placeholder={placeholder}
        placeholderTextColor={TOKENS.inkTertiary}
        accessibilityLabel={label}
        onChangeText={(siguiente) => {
          setTexto(siguiente)
          const fecha = parseFechaCorta(siguiente)
          if (fecha) onChange(fecha)
          else if (siguiente.trim() === '' && opcional) onChange(null)
        }}
        className={`min-h-[44px] border-b border-border-hairline text-body ${
          error ? 'text-importance' : 'text-ink'
        }`}
      />
      <Text className="min-h-4 text-meta text-ink-tertiary">
        {parseada ? formatFechaCorta(parseada) : error ? 'No entiendo esa fecha' : ''}
      </Text>
    </View>
  )
}
