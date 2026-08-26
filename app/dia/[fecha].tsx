import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

import { DayTimeline } from '../../src/features/day/DayTimeline'
import { TodayStrip, type PedidoAgendar } from '../../src/features/day/TodayStrip'
import { BlockSheet } from '../../src/features/day/BlockSheet'
import {
  borradorDe,
  borradorNuevo,
  type BloqueBorrador,
} from '../../src/features/day/blockDraft'
import {
  entradasDelTimeline,
  franjaSuperior,
  franjaVacia,
  slotSugerido,
} from '../../src/logic/dayTimeline'
import { parseISODate, toISODate, todayISO, type ISODate } from '../../src/lib/date'
import { usePlannerStore } from '../../src/store/usePlannerStore'
import { useUiStore } from '../../src/store/useUiStore'

const SWIPE_MIN_PX = 50

/** Deciding when you do what. Split in two: the what on top, the when below. */
export default function DayPage() {
  const params = useLocalSearchParams<{ fecha?: string; pendientes?: string }>()
  const fecha = (params.fecha ?? todayISO()) as ISODate
  // Arrived from the month's "Pendientes": open the list rather than making
  // the same request twice.
  const abrirPendientes = params.pendientes === '1'
  const data = usePlannerStore((s) => s.data)
  const router = useRouter()
  const [borrador, setBorrador] = useState<BloqueBorrador | null>(null)

  const setFechaContexto = useUiStore((s) => s.setFechaContexto)
  useEffect(() => setFechaContexto(fecha), [fecha, setFechaContexto])

  const entradas = entradasDelTimeline(data, fecha)
  const franja = franjaSuperior(data, fecha)

  const irA = (delta: number) =>
    router.replace({
      pathname: '/dia/[fecha]',
      params: { fecha: toISODate(addDays(parseISODate(fecha), delta)) },
    })

  // Held in a ref so the gesture is built once: rebuilding it on every date
  // change would drop a swipe already in flight.
  const irARef = useRef(irA)
  irARef.current = irA

  // Horizontal swipe changes day; the timeline's vertical scroll is left alone.
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-20, 20])
        .runOnJS(true)
        .onEnd((e) => {
          if (Math.abs(e.translationX) < SWIPE_MIN_PX) return
          if (Math.abs(e.translationX) < Math.abs(e.translationY)) return
          irARef.current(e.translationX < 0 ? 1 : -1)
        }),
    [],
  )

  return (
    <GestureDetector gesture={swipe}>
      <View className="flex-1 px-2">
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Día anterior"
            onPress={() => irA(-1)}
            className="h-11 w-11 items-center justify-center"
          >
            <Text className="text-title text-ink-secondary">‹</Text>
          </Pressable>

          <Text className="text-title font-bold capitalize text-ink">
            {format(parseISODate(fecha), "EEEE d 'de' MMMM", { locale: es })}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Día siguiente"
            onPress={() => irA(1)}
            className="h-11 w-11 items-center justify-center"
          >
            <Text className="text-title text-ink-secondary">›</Text>
          </Pressable>
        </View>

        {/* Empty strip collapses: no placeholder, no empty box. */}
        {!franjaVacia(franja) && (
          <TodayStrip
            // Keyed by date, so Pendientes never stays open from the day
            // before while showing another day's list.
            key={fecha}
            franja={franja}
            abrirPendientes={abrirPendientes}
            onAgendar={(pedido: PedidoAgendar) =>
              setBorrador(borradorNuevo(slotSugerido(entradas), pedido.titulo, pedido.ref))
            }
          />
        )}

        <DayTimeline
          entradas={entradas}
          esHoy={fecha === todayISO()}
          onCrear={(inicioMin) => setBorrador(borradorNuevo(inicioMin))}
          onEditar={(bloque) => setBorrador(borradorDe(bloque))}
        />

        {borrador && (
          <BlockSheet fecha={fecha} borrador={borrador} onClose={() => setBorrador(null)} />
        )}
      </View>
    </GestureDetector>
  )
}
