import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Link } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

import { MonthGrid } from '../src/features/month/MonthGrid'
import { DaySheet } from '../src/features/month/DaySheet'
import { itemsPorFecha } from '../src/logic/monthItems'
import { toISODate, todayISO, type ISODate } from '../src/lib/date'
import { usePlannerStore } from '../src/store/usePlannerStore'
import { useUiStore } from '../src/store/useUiStore'

const WEEK_OPTIONS = { weekStartsOn: 1 } as const // Monday first
const SWIPE_MIN_PX = 50

/** The shape of the month, at a glance. A screen for reading, not editing. */
export default function MonthPage() {
  const data = usePlannerStore((s) => s.data)
  const [mes, setMes] = useState(() => startOfMonth(new Date()))
  const [diaAbierto, setDiaAbierto] = useState<ISODate | null>(null)
  const hoy = todayISO()

  const dias = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(mes), WEEK_OPTIONS),
        end: endOfWeek(endOfMonth(mes), WEEK_OPTIONS),
      }),
    [mes],
  )

  // The range covers the whole grid, so leading and trailing days show their
  // bars too instead of looking like an empty week.
  const porFecha = useMemo(() => {
    const primero = dias[0]
    const ultimo = dias[dias.length - 1]
    if (!primero || !ultimo) return new Map<ISODate, never[]>()
    return itemsPorFecha(data, { desde: toISODate(primero), hasta: toISODate(ultimo) })
  }, [data, dias])

  // What the global "+" prefills: the day you tapped, else today when it is
  // in view, else the first of the month you are looking at.
  const setFechaContexto = useUiStore((s) => s.setFechaContexto)
  useEffect(() => {
    if (diaAbierto) return setFechaContexto(diaAbierto)
    const primero = toISODate(startOfMonth(mes))
    setFechaContexto(hoy.slice(0, 7) === primero.slice(0, 7) ? hoy : primero)
  }, [diaAbierto, mes, hoy, setFechaContexto])

  const irA = (delta: number) => setMes((actual) => addMonths(actual, delta))

  // Horizontal swipe changes month; vertical movement is left alone, so the
  // gesture never fights a scroll.
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onEnd((e) => {
          if (Math.abs(e.translationX) < SWIPE_MIN_PX) return
          if (Math.abs(e.translationX) < Math.abs(e.translationY)) return
          irA(e.translationX < 0 ? 1 : -1)
        }),
    [],
  )

  const sinDatos = data.ramos.length === 0 && data.compromisos.length === 0

  return (
    <GestureDetector gesture={swipe}>
      <View className="flex-1 px-2">
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mes anterior"
            onPress={() => irA(-1)}
            className="h-11 w-11 items-center justify-center"
          >
            <Text className="text-title text-ink-secondary">‹</Text>
          </Pressable>

          <Text className="text-title font-bold capitalize text-ink">
            {format(mes, 'MMMM yyyy', { locale: es })}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mes siguiente"
            onPress={() => irA(1)}
            className="h-11 w-11 items-center justify-center"
          >
            <Text className="text-title text-ink-secondary">›</Text>
          </Pressable>
        </View>

        <MonthGrid
          dias={dias}
          mes={mes}
          hoy={hoy}
          itemsPorFecha={porFecha}
          onSelectDay={setDiaAbierto}
        />

        {/* The FAB floats in this lane, so the last week is never under it. */}
        <View className="h-14" />

        {sinDatos && (
          <Text className="py-2 text-center text-meta text-ink-tertiary">
            Empezá cargando tus ramos en{' '}
            <Link href="/ramos" className="underline">
              Ramos
            </Link>
            .
          </Text>
        )}

        {diaAbierto && (
          <DaySheet fecha={diaAbierto} onClose={() => setDiaAbierto(null)} />
        )}
      </View>
    </GestureDetector>
  )
}
