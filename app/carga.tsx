import { useEffect, useState } from 'react'
import { Link, useRouter } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { Caret } from '../src/components/Caret'
import { courseColor } from '../src/design/palette'
import { TIPO_LABEL } from '../src/design/labels'
import {
  cargaDeRamos,
  proporcion,
  type CargaRamo,
  type PesoEvaluacion,
} from '../src/logic/cargaRamos'
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
 *
 * Tapping a ramo opens it into the evaluaciones it is made of, each with its
 * own bar on the same scale, so the parts visibly add up to the whole.
 */
export default function CargaPage() {
  const data = usePlannerStore((s) => s.data)

  // No date context here: the "+" means today.
  const setFechaContexto = useUiStore((s) => s.setFechaContexto)
  useEffect(() => setFechaContexto(todayISO()), [setFechaContexto])

  // Several at once, not an accordion: the screen exists to compare ramos, and
  // opening one should not close the one you were comparing it against.
  const [abiertos, setAbiertos] = useState<ReadonlySet<string>>(new Set())
  const alternar = (id: string) =>
    setAbiertos((previos) => {
      const siguientes = new Set(previos)
      if (!siguientes.delete(id)) siguientes.add(id)
      return siguientes
    })

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
          abierto={abiertos.has(fila.ramo.id)}
          onPress={() => alternar(fila.ramo.id)}
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
  abierto,
  onPress,
}: {
  carga: CargaRamo
  maximo: number
  abierto: boolean
  onPress: () => void
}) {
  const { ramo, desglose } = carga
  const proxima = desglose[0]
  const fraccion = proporcion(carga.puntaje, maximo)
  // One evaluación is not a breakdown: the row above already names it, and
  // opening it would just say the same line twice.
  const desplegable = desglose.length > 1

  return (
    <View className="border-b border-border-hairline">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: desplegable ? abierto : undefined }}
        accessibilityLabel={`${ramo.nombre}, ${desglose.length} por delante`}
        accessibilityHint={desplegable ? 'Muestra cada evaluación por separado' : undefined}
        onPress={desplegable ? onPress : undefined}
        disabled={!desplegable}
        className="min-h-[56px] justify-center gap-1 py-2"
      >
        <View className="flex-row items-center gap-3">
          <Text numberOfLines={1} className="flex-1 text-body text-ink">
            {ramo.nombre}
          </Text>
          {proxima && (
            <Text
              className={`text-meta ${
                // Red stays what it always is: high importance, nothing else.
                proxima.evaluacion.importancia === 'alta'
                  ? 'font-bold text-importance'
                  : 'text-ink-secondary'
              }`}
            >
              {cuando(proxima.dias)}
            </Text>
          )}
          {desplegable && <Caret abierto={abierto} />}
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
            ? `${TIPO_LABEL[proxima.evaluacion.tipo]} · ${proxima.evaluacion.titulo}${
                desglose.length > 1 ? ` · ${desglose.length} por delante` : ''
              }`
            : 'Nada por delante'}
        </Text>
      </Pressable>

      {abierto && desplegable && <Desglose carga={carga} maximo={maximo} />}
    </View>
  )
}

/**
 * The same bar, taken apart. Every piece is measured against the same máximo
 * as the ramo bars above, so the pieces of the heaviest ramo fill the width
 * exactly once between them — the whole really is the sum of its parts.
 */
function Desglose({ carga, maximo }: { carga: CargaRamo; maximo: number }) {
  const router = useRouter()

  return (
    <View className="gap-3 pb-3 pl-3">
      {carga.desglose.map((parte) => (
        <ParteCarga key={parte.evaluacion.id} parte={parte} carga={carga} maximo={maximo} />
      ))}

      <Pressable
        accessibilityRole="link"
        onPress={() =>
          router.push({ pathname: '/ramos/[id]', params: { id: carga.ramo.id } })
        }
        className="min-h-[44px] justify-center"
      >
        <Text className="text-meta text-ink underline">Ver {carga.ramo.nombre}</Text>
      </Pressable>
    </View>
  )
}

function ParteCarga({
  parte,
  carga,
  maximo,
}: {
  parte: PesoEvaluacion
  carga: CargaRamo
  maximo: number
}) {
  const { evaluacion, dias, peso } = parte

  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-3">
        <Text numberOfLines={1} className="flex-1 text-meta text-ink-secondary">
          {TIPO_LABEL[evaluacion.tipo]} · {evaluacion.titulo}
        </Text>
        <Text
          className={`text-meta ${
            evaluacion.importancia === 'alta'
              ? 'font-bold text-importance'
              : 'text-ink-tertiary'
          }`}
        >
          {cuando(dias)}
        </Text>
      </View>

      <View
        className="h-1 rounded-bar"
        style={{
          backgroundColor: courseColor(carga.ramo.color),
          width: `${Math.round(proporcion(peso, maximo) * 100)}%`,
        }}
      />
    </View>
  )
}


/** "hoy", "mañana", "en 5 días" — the same words you would say out loud. */
function cuando(dias: number): string {
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'mañana'
  return `en ${dias} días`
}
