import { useEffect, useRef, useState } from 'react'
import { addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate, useParams } from 'react-router'
import { DayTimeline } from '../features/day/DayTimeline'
import { TodayStrip, type PedidoAgendar } from '../features/day/TodayStrip'
import { BlockSheet } from '../features/day/BlockSheet'
import { borradorDe, borradorNuevo, type BloqueBorrador } from '../features/day/blockDraft'
import {
  entradasDelTimeline,
  franjaSuperior,
  franjaVacia,
  slotSugerido,
} from '../logic/dayTimeline'
import { parseISODate, toISODate, todayISO, type ISODate } from '../lib/date'
import { usePlannerStore } from '../store/usePlannerStore'
import { useUiStore } from '../store/useUiStore'

const SWIPE_MIN_PX = 50

/** Deciding when you do what. Split in two: the what on top, the when below. */
export function DayPage() {
  const { fecha = todayISO() } = useParams()
  const data = usePlannerStore((s) => s.data)
  const navigate = useNavigate()
  const [borrador, setBorrador] = useState<BloqueBorrador | null>(null)

  const setFechaContexto = useUiStore((s) => s.setFechaContexto)
  useEffect(() => setFechaContexto(fecha), [fecha, setFechaContexto])

  const entradas = entradasDelTimeline(data, fecha)
  const franja = franjaSuperior(data, fecha)
  const irA = (delta: number) =>
    void navigate(`/dia/${toISODate(addDays(parseISODate(fecha), delta))}`, { replace: true })
  const swipe = useSwipe(irA)

  return (
    <div className="flex h-full flex-col px-2" {...swipe}>
      <header className="flex shrink-0 items-center justify-between">
        <button
          type="button"
          onClick={() => irA(-1)}
          aria-label="Día anterior"
          className="h-11 w-11 text-ink-secondary"
        >
          ‹
        </button>
        <h1 className="text-title font-bold first-letter:uppercase">
          {format(parseISODate(fecha), "EEEE d 'de' MMMM", { locale: es })}
        </h1>
        <button
          type="button"
          onClick={() => irA(1)}
          aria-label="Día siguiente"
          className="h-11 w-11 text-ink-secondary"
        >
          ›
        </button>
      </header>

      {/* Empty strip collapses: no placeholder, no empty box. */}
      {!franjaVacia(franja) && (
        <TodayStrip
          franja={franja}
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
        <BlockSheet
          fecha={fecha as ISODate}
          borrador={borrador}
          onClose={() => setBorrador(null)}
        />
      )}
    </div>
  )
}

/** Horizontal swipe changes day; vertical scroll of the timeline is left alone. */
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
