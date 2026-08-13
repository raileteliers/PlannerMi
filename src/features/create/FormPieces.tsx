import { useState } from 'react'
import { Pressable, Text, TextInput } from 'react-native'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { TOKENS } from '../../design/tokens'

/** The one field every form starts with. */
export function CampoTitulo({
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  autoFocus?: boolean
}) {
  return (
    <TextInput
      value={value}
      autoFocus={autoFocus}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={TOKENS.inkTertiary}
      accessibilityLabel="Título"
      className="min-h-[44px] border-b border-border-hairline text-body text-ink"
    />
  )
}

/** Save, the error line, and delete when editing something that exists. */
export function FormActions({
  error,
  onGuardar,
  onEliminar,
  tituloEliminar,
  detalleEliminar,
  labelEliminar = 'Eliminar',
}: {
  error: string | null
  onGuardar: () => void
  onEliminar?: () => void
  tituloEliminar?: string
  detalleEliminar?: string
  labelEliminar?: string
}) {
  const [confirmando, setConfirmando] = useState(false)

  return (
    <>
      {error && <Text className="text-meta text-importance">{error}</Text>}

      <Pressable
        accessibilityRole="button"
        onPress={onGuardar}
        className="min-h-[44px] items-center justify-center rounded-card bg-accent"
      >
        <Text className="text-body text-on-accent">Guardar</Text>
      </Pressable>

      {onEliminar && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setConfirmando(true)}
          className="min-h-[44px] items-center justify-center"
        >
          <Text className="text-body text-importance">{labelEliminar}</Text>
        </Pressable>
      )}

      {confirmando && onEliminar && (
        <ConfirmDialog
          titulo={tituloEliminar ?? '¿Eliminar?'}
          {...(detalleEliminar ? { detalle: detalleEliminar } : {})}
          onConfirm={() => {
            setConfirmando(false)
            onEliminar()
          }}
          onCancel={() => setConfirmando(false)}
        />
      )}
    </>
  )
}
