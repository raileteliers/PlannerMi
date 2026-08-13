import { useEffect } from 'react'
import { Link, useRouter } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { courseColor } from '../src/design/palette'
import { TIPO_LABEL } from '../src/design/labels'
import { cargaDeRamos, proporcion, type CargaRamo } from '../src/logic/cargaRamos'
import { todayISO } from '../src/lib/date'
import { usePlannerStore } from '../src/store/usePlannerStore'
import { useUiStore } from '../src/store/useUiStore'

/**
 * Which ramo is heaviest right now. The month says what is happening; this
 * says what to work on tonight.
 *
 * A ramo's weight is its upcoming evaluaciones, each one worth how much it
 * matters times how hard it is times how close it is. The screen only ever
 * shows the comparison — the number itself is meaningless on its own, so it
 * is never printed.
 */
export default function CargaPage() {
  const data = usePlannerStore((s) => s.data)
  const router = useRouter()

  // No date context here: the "+" means today.
  const setFechaContexto = useUiStore((s) => s.setFechaContexto)
  useEffect(() => setFechaContexto(todayISO()), [setFechaContexto])

  const carga = cargaDeRamos(data)
  const maximo = carga[0]?.puntaje ?? 0

  if (carga.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-6 px-8">
        <Text className="text-center text-body text-ink-secondary">
          Todavía no tenés ramos activos.
        </Text>
        <Link href="/ramos" className="text-body text-ink underline">
          Ir a Ramos
        </Link>
      </View>
    )
  }

  return (
    <ScrollView className="px-4">
      <Text className="py-3 text-title font-bold text-ink">Carga</Text>

      {maximo === 0 ? (
        <Text className="pb-4 text-body text-ink-secondary">
          No tenés evaluaciones por delante.
        </Text>
      ) : (
        <Text className="pb-4 text-meta text-ink-tertiary">
          Por lo que se viene: cuánto pesa, qué tan difícil es y qué tan cerca está.
        </Text>
      )}

      {carga.map((fila) => (
        <FilaCarga
          key={fila.ramo.id}
          carga={fila}
          maximo={maximo}
          onPress={() =>
            router.push({ pathname: '/ramos/[id]', params: { id: fila.ramo.id } })
          }
        />
      ))}

      {/* The FAB floats over this lane. */}
      <View className="h-20" />
    </ScrollView>
  )
}

function FilaCarga({
  carga,
  maximo,
  onPress,
}: {
  carga: CargaRamo
  maximo: number
  onPress: () => void
}) {
  const { ramo, proxima, diasHastaProxima, pendientes } = carga
  const fraccion = proporcion(carga.puntaje, maximo)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ramo.nombre}, ${pendientes} por delante`}
      onPress={onPress}
      className="min-h-[56px] justify-center gap-1 border-b border-border-hairline py-2"
    >
      <View className="flex-row items-center gap-3">
        <Text numberOfLines={1} className="flex-1 text-body text-ink">
          {ramo.nombre}
        </Text>
        {proxima && (
          <Text
            className={`text-meta ${
              // Red stays what it always is: high importance, nothing else.
              proxima.importancia === 'alta'
                ? 'font-bold text-importance'
                : 'text-ink-secondary'
            }`}
          >
            {cuando(diasHastaProxima ?? 0)}
          </Text>
        )}
      </View>

      {/* Length is the whole message, so there is no track behind it: an
          empty ramo shows nothing rather than an empty container. */}
      <View
        className="h-1.5 rounded-bar"
        style={{
          backgroundColor: courseColor(ramo.color),
          // Percentage keeps it honest at any screen width.
          width: `${Math.round(fraccion * 100)}%`,
        }}
      />

      <Text numberOfLines={1} className="text-meta text-ink-tertiary">
        {proxima
          ? `${TIPO_LABEL[proxima.tipo]} · ${proxima.titulo}${
              pendientes > 1 ? ` · ${pendientes} por delante` : ''
            }`
          : 'Nada por delante'}
      </Text>
    </Pressable>
  )
}

/** "hoy", "mañana", "en 5 días" — the same words you would say out loud. */
function cuando(dias: number): string {
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'mañana'
  return `en ${dias} días`
}
