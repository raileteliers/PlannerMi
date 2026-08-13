import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { courseColor } from '../../design/palette'
import { RECURRING_ALPHA, TOKENS } from '../../design/tokens'
import { toHoraHHMM } from '../../lib/time'
import {
  SLOTS,
  SLOT_MIN,
  TIMELINE_FIN_MIN,
  TIMELINE_INICIO_MIN,
  ubicarEntradas,
  type EntradaTimeline,
} from '../../logic/dayTimeline'
import type { BloqueTiempo } from '../../model/types'

/** 44px per slot: the minimum touch target, and it keeps the hour readable. */
const SLOT_PX = 44
const GUTTER_PX = 44

/**
 * The *when* half of the day. Tapping an empty slot opens the sheet with the
 * hour filled in — there is no drag to draw a block, on purpose: on a phone
 * it fights the scroll and produces 15-minute blocks by accident.
 */
export function DayTimeline({
  entradas,
  esHoy,
  onCrear,
  onEditar,
}: {
  entradas: EntradaTimeline[]
  esHoy: boolean
  onCrear: (inicioMin: number) => void
  onEditar: (bloque: BloqueTiempo) => void
}) {
  const scrollRef = useRef<ScrollView>(null)
  const ahoraMin = useAhoraMin(esHoy)
  const ubicadas = ubicarEntradas(entradas)

  // React Native has no `calc()`, so the lane width is measured rather than
  // expressed: entries are placed in pixels once the timeline knows how wide
  // it is. Zero until the first layout, which is why entries wait for it.
  const [ancho, setAncho] = useState(0)

  // Land on the interesting part of the day instead of at 07:00.
  useEffect(() => {
    const objetivo = (ahoraMin ?? 8 * 60) - TIMELINE_INICIO_MIN - SLOT_MIN
    scrollRef.current?.scrollTo({
      y: Math.max(0, (objetivo / SLOT_MIN) * SLOT_PX),
      animated: false,
    })
    // Only on mount: re-scrolling while the user reads would fight them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ScrollView
      ref={scrollRef}
      className="flex-1"
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
    >
      {/* Extra height at the end so the last hour clears the floating FAB. */}
      <View style={{ height: SLOTS * SLOT_PX + 56 }}>
        {Array.from({ length: SLOTS }, (_, i) => {
          const inicioMin = TIMELINE_INICIO_MIN + i * SLOT_MIN
          const enHora = inicioMin % 60 === 0
          return (
            <Pressable
              key={inicioMin}
              accessibilityRole="button"
              accessibilityLabel={`Agregar bloque a las ${toHoraHHMM(inicioMin)}`}
              onPress={() => onCrear(inicioMin)}
              className={`absolute left-0 right-0 ${
                enHora ? 'border-t border-border-hairline' : ''
              }`}
              style={{ top: i * SLOT_PX, height: SLOT_PX }}
            >
              {enHora && (
                <Text className="absolute left-1 top-1 text-meta text-ink-tertiary">
                  {toHoraHHMM(inicioMin)}
                </Text>
              )}
            </Pressable>
          )
        })}

        {ancho > 0 &&
          ubicadas.map(({ entrada, columna, columnas }) => (
            <Entrada
              key={entrada.id}
              entrada={entrada}
              columna={columna}
              columnas={columnas}
              anchoDisponible={ancho - GUTTER_PX}
              onEditar={onEditar}
            />
          ))}

        {ahoraMin !== null && (
          <View
            pointerEvents="none"
            className="absolute left-0 right-0 border-t border-importance"
            style={{ top: ((ahoraMin - TIMELINE_INICIO_MIN) / SLOT_MIN) * SLOT_PX }}
          >
            <View
              className="absolute left-0 h-[6px] w-[6px] rounded-full bg-importance"
              style={{ top: -3 }}
            />
          </View>
        )}
      </View>
    </ScrollView>
  )
}

function Entrada({
  entrada,
  columna,
  columnas,
  anchoDisponible,
  onEditar,
}: {
  entrada: EntradaTimeline
  columna: number
  columnas: number
  anchoDisponible: number
  onEditar: (bloque: BloqueTiempo) => void
}) {
  // An entry can start before 07:00 or end after 23:00 — a doctor at 06:30,
  // a block someone typed until midnight. It is clipped to the timeline
  // instead of drawing outside it.
  const inicioVisible = Math.max(entrada.inicioMin, TIMELINE_INICIO_MIN)
  const finVisible = Math.min(entrada.finMin, TIMELINE_FIN_MIN)
  const top = ((inicioVisible - TIMELINE_INICIO_MIN) / SLOT_MIN) * SLOT_PX
  const alto = Math.max(((finVisible - inicioVisible) / SLOT_MIN) * SLOT_PX, 22)
  const ancho = anchoDisponible / columnas

  const estilo = { top, height: alto, left: GUTTER_PX + columna * ancho, width: ancho }

  const contenido = (
    <>
      <View
        className="absolute bottom-0 left-0 top-0 w-1 rounded-bar"
        style={{
          backgroundColor: entrada.color ? courseColor(entrada.color) : TOKENS.borderStrong,
          opacity: entrada.esRecurrente ? RECURRING_ALPHA : 1,
        }}
      />
      <Text numberOfLines={1} className="pl-3 text-meta text-ink-secondary">
        {toHoraHHMM(entrada.inicioMin)}
      </Text>
      <Text numberOfLines={1} className="pl-3 text-body text-ink">
        {entrada.titulo}
      </Text>
    </>
  )

  // Commitments live in the timeline but are not edited from here.
  if (entrada.tipo === 'compromiso') {
    return (
      <View
        className="absolute overflow-hidden rounded-card bg-surface-muted pt-1"
        style={estilo}
      >
        {contenido}
      </View>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => entrada.bloque && onEditar(entrada.bloque)}
      className="absolute overflow-hidden rounded-card border border-border-hairline bg-surface-raised pt-1"
      style={estilo}
    >
      {contenido}
    </Pressable>
  )
}

/** Minutes since midnight, refreshed every minute, or null if not today. */
function useAhoraMin(esHoy: boolean): number | null {
  const calcular = () => {
    const ahora = new Date()
    return ahora.getHours() * 60 + ahora.getMinutes()
  }
  const [minutos, setMinutos] = useState(calcular)

  useEffect(() => {
    const id = setInterval(() => setMinutos(calcular()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (!esHoy) return null
  if (minutos < TIMELINE_INICIO_MIN || minutos > TIMELINE_FIN_MIN) return null
  return minutos
}
