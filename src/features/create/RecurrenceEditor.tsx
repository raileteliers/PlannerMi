import { Pressable, Text, TextInput, View } from 'react-native'
import { DateInput } from '../../components/DateInput'
import { ChipGroup } from '../../components/ChipGroup'
import { DIA_SEMANA_LABEL, FRECUENCIA_LABEL } from '../../design/labels'
import type { ISODate } from '../../lib/date'
import type { Recurrencia } from '../../model/types'

const FRECUENCIAS: Recurrencia['frecuencia'][] = ['diaria', 'semanal', 'mensual']

/**
 * Notion-level recurrence: frequency, interval, weekdays, an end date.
 * Exceptions are not edited here — they are made by cancelling one occurrence
 * from the day it falls on.
 */
export function RecurrenceEditor({
  value,
  onChange,
}: {
  value: Recurrencia
  onChange: (recurrencia: Recurrencia) => void
}) {
  const dias = value.diasSemana ?? []

  const toggleDia = (dia: number) => {
    const siguiente = dias.includes(dia) ? dias.filter((d) => d !== dia) : [...dias, dia]
    // Never leave a weekly series with no day: it would have no occurrences.
    onChange({ ...value, diasSemana: siguiente.length > 0 ? siguiente.sort() : dias })
  }

  return (
    <View className="gap-3 border-l-2 border-border-hairline pl-3">
      <View className="flex-row items-center gap-2">
        <Text className="text-meta text-ink-tertiary">Cada</Text>
        <TextInput
          value={String(value.intervalo)}
          inputMode="numeric"
          accessibilityLabel="Cada cuántos"
          onChangeText={(texto) => {
            const n = Number(texto.replace(/\D/g, ''))
            onChange({ ...value, intervalo: Number.isFinite(n) && n > 0 ? n : 1 })
          }}
          className="min-h-[44px] w-12 border-b border-border-hairline text-center text-body text-ink"
        />
      </View>

      <ChipGroup
        label="Frecuencia"
        value={value.frecuencia}
        options={FRECUENCIAS}
        labels={FRECUENCIA_LABEL}
        onChange={(frecuencia) => onChange({ ...value, frecuencia })}
      />

      {value.frecuencia === 'semanal' && (
        <View className="flex-row" accessibilityLabel="Días de la semana">
          {DIA_SEMANA_LABEL.map((label, dia) => {
            const activo = dias.includes(dia)
            return (
              <Pressable
                key={dia}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                accessibilityLabel={`Día ${label}`}
                onPress={() => toggleDia(dia)}
                className="h-11 w-11 items-center justify-center"
              >
                <Text
                  className={`text-meta ${activo ? 'font-bold text-ink' : 'text-ink-tertiary'}`}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}

      <DateInput
        label="Hasta (opcional)"
        opcional
        value={value.hasta ?? null}
        onChange={(hasta: ISODate | null) =>
          onChange({ ...value, ...(hasta ? { hasta } : { hasta: undefined }) })
        }
      />
    </View>
  )
}
