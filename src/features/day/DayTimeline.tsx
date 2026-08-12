import { useEffect, useRef, useState } from 'react'
import { courseColorVar } from '../../design/palette'
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const ahoraMin = useAhoraMin(esHoy)
  const ubicadas = ubicarEntradas(entradas)

  // Land on the interesting part of the day instead of at 07:00.
  useEffect(() => {
    const objetivo = (ahoraMin ?? 8 * 60) - TIMELINE_INICIO_MIN - SLOT_MIN
    scrollRef.current?.scrollTo({ top: Math.max(0, (objetivo / SLOT_MIN) * SLOT_PX) })
    // Only on mount: re-scrolling while the user reads would fight them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="relative" style={{ height: SLOTS * SLOT_PX }}>
        {Array.from({ length: SLOTS }, (_, i) => {
          const inicioMin = TIMELINE_INICIO_MIN + i * SLOT_MIN
          const enHora = inicioMin % 60 === 0
          return (
            <button
              key={inicioMin}
              type="button"
              onClick={() => onCrear(inicioMin)}
              aria-label={`Agregar bloque a las ${toHoraHHMM(inicioMin)}`}
              className={`absolute right-0 left-0 ${enHora ? 'border-t border-border-hairline' : ''}`}
              style={{ top: i * SLOT_PX, height: SLOT_PX }}
            >
              {enHora && (
                <span className="absolute top-1 left-1 text-meta text-ink-tertiary">
                  {toHoraHHMM(inicioMin)}
                </span>
              )}
            </button>
          )
        })}

        {ubicadas.map(({ entrada, columna, columnas }) => (
          <Entrada
            key={entrada.id}
            entrada={entrada}
            columna={columna}
            columnas={columnas}
            onEditar={onEditar}
          />
        ))}

        {ahoraMin !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 left-0 border-t border-importance"
            style={{ top: ((ahoraMin - TIMELINE_INICIO_MIN) / SLOT_MIN) * SLOT_PX }}
          >
            <span className="absolute -top-[3px] left-0 block h-[6px] w-[6px] rounded-full bg-importance" />
          </div>
        )}
      </div>
    </div>
  )
}

function Entrada({
  entrada,
  columna,
  columnas,
  onEditar,
}: {
  entrada: EntradaTimeline
  columna: number
  columnas: number
  onEditar: (bloque: BloqueTiempo) => void
}) {
  // An entry can start before 07:00 or end after 23:00 — a doctor at 06:30,
  // a block someone typed until midnight. It is clipped to the timeline
  // instead of drawing outside it.
  const inicioVisible = Math.max(entrada.inicioMin, TIMELINE_INICIO_MIN)
  const finVisible = Math.min(entrada.finMin, TIMELINE_FIN_MIN)
  const top = ((inicioVisible - TIMELINE_INICIO_MIN) / SLOT_MIN) * SLOT_PX
  const alto = Math.max(((finVisible - inicioVisible) / SLOT_MIN) * SLOT_PX, 22)
  const ancho = `calc((100% - ${GUTTER_PX}px) / ${columnas})`

  const contenido = (
    <>
      <span
        className="absolute top-0 bottom-0 left-0 w-1 rounded-bar"
        style={{
          background: entrada.color ? courseColorVar(entrada.color) : 'var(--pm-border-strong)',
          opacity: entrada.esRecurrente ? 'var(--pm-recurring-alpha)' : 1,
        }}
      />
      <span className="block truncate pl-3 text-meta text-ink-secondary">
        {toHoraHHMM(entrada.inicioMin)}
      </span>
      <span className="block truncate pl-3 text-body">{entrada.titulo}</span>
    </>
  )

  const estilo = {
    top,
    height: alto,
    left: `calc(${GUTTER_PX}px + ${columna} * ${ancho})`,
    width: ancho,
  }

  // Commitments live in the timeline but are not edited from here.
  if (entrada.tipo === 'compromiso') {
    return (
      <div
        className="absolute overflow-hidden rounded-card bg-surface-muted pt-1"
        style={estilo}
      >
        {contenido}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => entrada.bloque && onEditar(entrada.bloque)}
      className="absolute overflow-hidden rounded-card border border-border-hairline bg-surface-raised pt-1 text-left"
      style={estilo}
    >
      {contenido}
    </button>
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
