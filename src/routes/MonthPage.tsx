import { useEffect, useMemo, useRef, useState } from 'react'
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
import { Link } from 'react-router'
import { MonthGrid } from '../features/month/MonthGrid'
import { DaySheet } from '../features/month/DaySheet'
import { itemsPorFecha } from '../logic/monthItems'
import { toISODate, todayISO, type ISODate } from '../lib/date'
import { usePlannerStore } from '../store/usePlannerStore'
import { useUiStore } from '../store/useUiStore'

const WEEK_OPTIONS = { weekStartsOn: 1 } as const // Monday first
const SWIPE_MIN_PX = 50

/** The shape of the month, at a glance. A screen for reading, not editing. */
export function MonthPage() {
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
    if (!primero || !ultimo) return new Map()
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
  const swipe = useSwipe(irA)
  const sinDatos = data.ramos.length === 0 && data.compromisos.length === 0

  return (
    <div className="flex h-full flex-col px-2" {...swipe}>
      <header className="flex shrink-0 items-center justify-between">
        <button
          type="button"
          onClick={() => irA(-1)}
          aria-label="Mes anterior"
          className="h-11 w-11 text-ink-secondary"
        >
          ‹
        </button>
        <h1 className="text-title font-bold first-letter:uppercase">
          {format(mes, 'MMMM yyyy', { locale: es })}
        </h1>
        <button
          type="button"
          onClick={() => irA(1)}
          aria-label="Mes siguiente"
          className="h-11 w-11 text-ink-secondary"
        >
          ›
        </button>
      </header>

      <MonthGrid
        dias={dias}
        mes={mes}
        hoy={hoy}
        itemsPorFecha={porFecha}
        onSelectDay={setDiaAbierto}
      />

      {/* The FAB floats in this lane, so the last week is never under it. */}
      <div aria-hidden="true" className="h-14 shrink-0" />

      {sinDatos && (
        <p className="shrink-0 py-2 text-center text-meta text-ink-tertiary">
          Empezá cargando tus ramos en{' '}
          <Link to="/ramos" className="underline">
            Ramos
          </Link>
          .
        </p>
      )}

      {diaAbierto && <DaySheet fecha={diaAbierto} onClose={() => setDiaAbierto(null)} />}
    </div>
  )
}

/** Horizontal swipe changes month; vertical movement is left alone. */
function useSwipe(irA: (delta: number) => void) {
  const inicio = useRef<{ x: number; y: number } | null>(null)

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0]
      inicio.current = t ? { x: t.clientX, y: t.clientY } : null
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const t = e.changedTouches[0]
      const desde = inicio.current
      inicio.current = null
      if (!t || !desde) return

      const dx = t.clientX - desde.x
      const dy = t.clientY - desde.y
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return
      irA(dx < 0 ? 1 : -1)
    },
  }
}
