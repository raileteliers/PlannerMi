import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { BottomSheet } from '../../components/BottomSheet'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { TOKENS } from '../../design/tokens'
import { formatDuracion, parseHoraCorta, toMinutos } from '../../lib/time'
import { usePlannerStore } from '../../store/usePlannerStore'
import type { ISODate } from '../../model/types'
import type { BloqueBorrador } from './blockDraft'

/** Create or edit one block. Times are typed, like dates. */
export function BlockSheet({
  fecha,
  borrador,
  onClose,
}: {
  fecha: ISODate
  borrador: BloqueBorrador
  onClose: () => void
}) {
  const createBloque = usePlannerStore((s) => s.createBloque)
  const updateBloque = usePlannerStore((s) => s.updateBloque)
  const deleteBloque = usePlannerStore((s) => s.deleteBloque)

  const [titulo, setTitulo] = useState(borrador.titulo)
  const [inicio, setInicio] = useState(borrador.horaInicio)
  const [fin, setFin] = useState(borrador.horaFin)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  const horaInicio = parseHoraCorta(inicio)
  const horaFin = parseHoraCorta(fin)
  const duracion = horaInicio && horaFin ? toMinutos(horaFin) - toMinutos(horaInicio) : null

  async function guardar() {
    if (titulo.trim() === '') return setError('Ponele un título.')
    if (!horaInicio || !horaFin) return setError('Revisá las horas.')
    if (duracion === null || duracion <= 0) {
      return setError('La hora de término tiene que ser posterior.')
    }

    const campos = {
      fecha,
      titulo: titulo.trim(),
      horaInicio,
      horaFin,
      ...(borrador.ref ? { ref: borrador.ref } : {}),
    }
    const ok = borrador.id
      ? await updateBloque(borrador.id, campos)
      : (await createBloque(campos)) !== null
    if (ok) onClose()
  }

  return (
    <BottomSheet titulo={borrador.id ? 'Editar bloque' : 'Nuevo bloque'} onClose={onClose}>
      <View className="gap-3 pb-2 pt-1">
        <TextInput
          value={titulo}
          autoFocus={titulo === ''}
          onChangeText={(texto) => {
            setTitulo(texto)
            setError(null)
          }}
          placeholder="¿Qué vas a hacer?"
          placeholderTextColor={TOKENS.inkTertiary}
          accessibilityLabel="Título del bloque"
          className="min-h-[44px] border-b border-border-hairline text-body text-ink"
        />

        <View className="flex-row items-center gap-3">
          <CampoHora label="Desde" value={inicio} onChange={setInicio} />
          <CampoHora label="Hasta" value={fin} onChange={setFin} />
          <Text className="self-end pb-2 text-meta text-ink-tertiary">
            {duracion !== null && duracion > 0 ? formatDuracion(duracion) : '—'}
          </Text>
        </View>

        {error && <Text className="text-meta text-importance">{error}</Text>}

        <Pressable
          accessibilityRole="button"
          onPress={() => void guardar()}
          className="min-h-[44px] items-center justify-center rounded-card bg-accent"
        >
          <Text className="text-body text-on-accent">Guardar</Text>
        </Pressable>

        {borrador.id && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setConfirmando(true)}
            className="min-h-[44px] items-center justify-center"
          >
            <Text className="text-body text-importance">Eliminar bloque</Text>
          </Pressable>
        )}
      </View>

      {confirmando && borrador.id && (
        <ConfirmDialog
          titulo={`¿Eliminar ${borrador.titulo}?`}
          detalle="El bloque desaparece de tu día."
          onConfirm={() => {
            setConfirmando(false)
            void deleteBloque(borrador.id as string).then(onClose)
          }}
          onCancel={() => setConfirmando(false)}
        />
      )}
    </BottomSheet>
  )
}

function CampoHora({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <View>
      <Text className="text-meta text-ink-tertiary">{label}</Text>
      <TextInput
        value={value}
        inputMode="numeric"
        onChangeText={onChange}
        accessibilityLabel={label}
        className={`min-h-[44px] w-20 border-b border-border-hairline text-body ${
          parseHoraCorta(value) === null ? 'text-importance' : 'text-ink'
        }`}
      />
    </View>
  )
}
