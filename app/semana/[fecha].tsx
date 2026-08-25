import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocalSearchParams, useRouter, Link } from 'expo-router'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'

import { BottomSheet } from '../../src/components/BottomSheet'
import { DaySheet } from '../../src/features/month/DaySheet'
import { TareaForm } from '../../src/features/create/TareaForm'
import { WeekList } from '../../src/features/week/WeekList'
import {
  entradasDeSemana,
  rangoSemanaLabel,
  semanaDe,
  semanaVecina,
  tareasPendientes,
  tareasSinFecha,
} from '../../src/logic/weekItems'
import { todayISO, type ISODate } from '../../src/lib/date'
import type { Tarea } from '../../src/model/types'
import { usePlannerStore } from '../../src/store/usePlannerStore'
import { useUiStore } from '../../src/store/useUiStore'

const SWIPE_MIN_PX = 50

/** Below this the seven days stack; above it they sit side by side. */
const ANCHO_COLUMNAS_PX = 760

/**
 * The week you are in, on one plane: every day with what it holds and what
 * there is to do in it.
 *
 * The month answers "how loaded is this?"; the week answers "what do I move
 * where?" — which is why this screen carries titles and checkboxes where the
 * month carries bars.
 */
export default function WeekPage() {
  const params = useLocalSearchParams<{ fecha?: string }>()
  const fecha = (params.fecha ?? todayISO()) as ISODate
  const data = usePlannerStore((s) => s.data)
  const router = useRouter()
  const { width } = useWindowDimensions()
  const [diaAbierto, setDiaAbierto] = useState<ISODate | null>(null)
  const [tareaAbierta, setTareaAbierta] = useState<Tarea | null>(null)
  const hoy = todayISO()

  const fechas = useMemo(() => semanaDe(fecha), [fecha])
  const dias = useMemo(() => entradasDeSemana(data, fechas), [data, fechas])
  const sinFecha = useMemo(() => tareasSinFecha(data), [data])
  // Only what falls in the week. The loose pile has its own strip and its own
  // count; folding it in here would make the number mean two things.
  const pendientes = tareasPendientes(dias)

  // What the global "+" prefills: the day you tapped, else today when this is
  // the current week, else the Monday you are looking at.
  const setFechaContexto = useUiStore((s) => s.setFechaContexto)
  useEffect(() => {
    if (diaAbierto) return setFechaContexto(diaAbierto)
    const lunes = fechas[0] as ISODate
    setFechaContexto(fechas.includes(hoy) ? hoy : lunes)
  }, [diaAbierto, fechas, hoy, setFechaContexto])

  const irA = (delta: number) =>
    router.replace({
      pathname: '/semana/[fecha]',
      params: { fecha: semanaVecina(fecha, delta) },
    })

  // Held in a ref so the gesture is built once: rebuilding it on every date
  // change would drop a swipe already in flight.
  const irARef = useRef(irA)
  irARef.current = irA

  // Horizontal swipe changes week; the list's vertical scroll is left alone.
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

  const sinDatos = data.ramos.length === 0 && data.compromisos.length === 0

  return (
    <GestureDetector gesture={swipe}>
      <View className="flex-1 px-2">
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Semana anterior"
            onPress={() => irA(-1)}
            className="h-11 w-11 items-center justify-center"
          >
            <Text className="text-title text-ink-secondary">‹</Text>
          </Pressable>

          <View className="items-center">
            <Text className="text-title font-bold text-ink">{rangoSemanaLabel(fechas)}</Text>
            {pendientes > 0 && (
              <Text className="text-meta text-ink-tertiary">
                {pendientes === 1 ? '1 tarea pendiente' : `${pendientes} tareas pendientes`}
              </Text>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Semana siguiente"
            onPress={() => irA(1)}
            className="h-11 w-11 items-center justify-center"
          >
            <Text className="text-title text-ink-secondary">›</Text>
          </Pressable>
        </View>

        <WeekList
          dias={dias}
          sinFecha={sinFecha}
          hoy={hoy}
          enColumnas={width >= ANCHO_COLUMNAS_PX}
          onSelectDay={setDiaAbierto}
          onEditarTarea={setTareaAbierta}
        />

        {sinDatos && (
          <Text className="py-2 text-center text-meta text-ink-tertiary">
            Empezá cargando tus ramos en{' '}
            <Link href="/ramos" className="underline">
              Ramos
            </Link>
            .
          </Text>
        )}

        {diaAbierto && <DaySheet fecha={diaAbierto} onClose={() => setDiaAbierto(null)} />}

        {/* Giving a loose task its day is what this screen is for, so the form
            opens here rather than behind a trip through the day sheet. */}
        {tareaAbierta && (
          <BottomSheet titulo="Editar tarea" onClose={() => setTareaAbierta(null)}>
            <TareaForm
              fecha={fechas[0] as ISODate}
              existente={tareaAbierta}
              onClose={() => setTareaAbierta(null)}
            />
          </BottomSheet>
        )}
      </View>
    </GestureDetector>
  )
}
