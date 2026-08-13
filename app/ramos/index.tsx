import { useEffect, useRef, useState } from 'react'
import { Link } from 'expo-router'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'

import { COURSE_COLORS, courseColor, type ColorToken } from '../../src/design/palette'
import { RECURRING_ALPHA, TOKENS } from '../../src/design/tokens'
import { ColorPicker } from '../../src/components/ColorPicker'
import { usePlannerStore } from '../../src/store/usePlannerStore'
import { useUiStore } from '../../src/store/useUiStore'
import { todayISO } from '../../src/lib/date'
import {
  pendientesDeRamo,
  ramosActivos,
  ramosArchivados,
  siguienteColorLibre,
} from '../../src/store/selectors'
import type { Ramo } from '../../src/model/types'

/**
 * The way into the app, and the answer to the risk of it sitting empty.
 * Creating a ramo is one field: type the name, press Enter, the row stays
 * ready for the next one.
 */
export default function CoursesPage() {
  const data = usePlannerStore((s) => s.data)
  const activos = ramosActivos(data)
  const archivados = ramosArchivados(data)
  // No date context on this screen: the "+" means today.
  const setFechaContexto = useUiStore((s) => s.setFechaContexto)
  useEffect(() => setFechaContexto(todayISO()), [setFechaContexto])
  const [creando, setCreando] = useState(false)

  if (data.ramos.length === 0 && !creando) {
    return <SinRamos onCrear={() => setCreando(true)} />
  }

  // One layout from here on: saving the first ramo must not swap the input
  // out from under the cursor, or the next name is typed into nothing.
  return (
    <ScrollView className="px-4" keyboardShouldPersistTaps="handled">
      <Text className="py-3 text-title font-bold text-ink">Ramos</Text>

      {activos.map((ramo) => (
        <RamoRow key={ramo.id} ramo={ramo} pendientes={pendientesDeRamo(data, ramo.id)} />
      ))}

      <NuevoRamoRow autoFocus={creando} />

      {archivados.length > 0 && (
        <View className="mt-8">
          <Text className="text-meta text-ink-secondary">Archivados</Text>
          <View className="mt-1">
            {archivados.map((ramo) => (
              <RamoRow key={ramo.id} ramo={ramo} pendientes={0} archivado />
            ))}
          </View>
        </View>
      )}

      {/* The FAB floats over this lane. */}
      <View className="h-20" />
    </ScrollView>
  )
}

/** The empty screen is the onboarding: one line and one action. */
function SinRamos({ onCrear }: { onCrear: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-6 px-8">
      <Text className="text-body text-ink-secondary">Todavía no tenés ramos.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onCrear}
        className="min-h-[44px] justify-center rounded-card bg-accent px-6"
      >
        <Text className="text-body text-on-accent">Crear el primero</Text>
      </Pressable>
    </View>
  )
}

function RamoRow({
  ramo,
  pendientes,
  archivado = false,
}: {
  ramo: Ramo
  pendientes: number
  archivado?: boolean
}) {
  return (
    <Link href={{ pathname: '/ramos/[id]', params: { id: ramo.id } }} asChild>
      <Pressable className="min-h-[56px] flex-row items-center gap-3 border-b border-border-hairline">
        <View
          className="h-6 w-1 rounded-bar"
          style={{
            backgroundColor: courseColor(ramo.color),
            opacity: archivado ? RECURRING_ALPHA : 1,
          }}
        />
        <View className="flex-1">
          <Text
            numberOfLines={1}
            className={`text-body ${archivado ? 'text-ink-secondary' : 'text-ink'}`}
          >
            {ramo.nombre}
          </Text>
          {ramo.sigla && <Text className="text-meta text-ink-tertiary">{ramo.sigla}</Text>}
        </View>
        {!archivado && (
          <Text className="text-meta text-ink-secondary">
            {pendientes === 0
              ? 'sin pendientes'
              : `${pendientes} pendiente${pendientes === 1 ? '' : 's'}`}
          </Text>
        )}
      </Pressable>
    </Link>
  )
}

/** Type a name, press Enter, keep typing the next one. */
function NuevoRamoRow({ autoFocus = false }: { autoFocus?: boolean }) {
  const data = usePlannerStore((s) => s.data)
  const createRamo = usePlannerStore((s) => s.createRamo)
  const inputRef = useRef<TextInput>(null)
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState<ColorToken | null>(null)

  const usados = data.ramos.map((r) => r.color)
  const colorElegido = color ?? siguienteColorLibre(COURSE_COLORS, usados)

  async function guardar() {
    const limpio = nombre.trim()
    if (limpio === '') return

    // Clear before awaiting the write: at typing speed the next name starts
    // arriving while SQLite is still busy, and it would land on top of this
    // one.
    setNombre('')
    setColor(null) // the next ramo gets the next free color

    const creado = await createRamo({ nombre: limpio, color: colorElegido, archivado: false })
    if (!creado) setNombre(limpio)
  }

  // Input above, colors below: six 44px targets and a name field cannot share
  // one row on a 390px screen without one of them losing.
  //
  // Saving is the return key only. The web version also saved on blur, but a
  // phone has no `relatedTarget` to tell "tapped a color" from "left the
  // field" — blur-saving here would file a ramo every time a color is picked.
  return (
    <View className="border-b border-border-hairline">
      <TextInput
        ref={inputRef}
        value={nombre}
        autoFocus={autoFocus}
        onChangeText={setNombre}
        onSubmitEditing={() => void guardar()}
        submitBehavior="submit"
        returnKeyType="done"
        placeholder="Nuevo ramo"
        placeholderTextColor={TOKENS.inkTertiary}
        accessibilityLabel="Nombre del nuevo ramo"
        className="min-h-[44px] text-body text-ink"
      />
      <ColorPicker value={colorElegido} onChange={setColor} />
    </View>
  )
}
