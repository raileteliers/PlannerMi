import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { View } from 'react-native'

import type { ISODate } from '../../lib/date'

/** A day, as somewhere a task can be dropped. */
export interface Zona {
  clave: string
  /** `undefined` is the loose pile, which is a destination like any other. */
  fecha: ISODate | undefined
  left: number
  right: number
  top: number
  bottom: number
}

interface Contexto {
  registrar: (clave: string, fecha: ISODate | undefined, nodo: View | null) => void
  /**
   * Measured once, when the drag starts, and not on every frame: measuring is
   * a round trip to the native side, and the list does not move underneath a
   * drag that is already in flight.
   */
  medir: () => void
  zonaEn: (x: number, y: number) => Zona | null
  /** The zone under the finger right now, so it can be lit up. */
  activa: string | null
  setActiva: (clave: string | null) => void
  limpiar: () => void
}

const Ctx = createContext<Contexto | null>(null)

/**
 * Where a node is, in the coordinate space a gesture reports in.
 *
 * Two ways, because the ref hands back two different things. On a phone it is
 * a React Native host component, which has `measureInWindow`. On React Native
 * Web it is the DOM element, which does not — and calling the missing method
 * threw nothing and measured nothing, so every drop landed nowhere and the
 * whole thing failed silently.
 */
type Medida = (x: number, y: number, ancho: number, alto: number) => void

function medirNodo(nodo: View, alMedir: Medida): void {
  // The DOM one first, and deliberately. React Native Web nodes can carry both:
  // `measureInWindow` is there but its callback never fires, so preferring it
  // measured nothing and every cross-day drop silently found no day at all.
  // `getBoundingClientRect` is synchronous and cannot half-answer.
  const web = nodo as unknown as { getBoundingClientRect?: () => DOMRect }
  if (typeof web.getBoundingClientRect === 'function') {
    const r = web.getBoundingClientRect()
    alMedir(r.left, r.top, r.width, r.height)
    return
  }

  const nativo = nodo as unknown as { measureInWindow?: (cb: Medida) => void }
  if (typeof nativo.measureInWindow === 'function') nativo.measureInWindow(alMedir)
}

export function ZonasProvider({ children }: { children: React.ReactNode }) {
  const nodos = useRef(new Map<string, { fecha: ISODate | undefined; nodo: View }>())
  const medidas = useRef<Zona[]>([])
  const [activa, setActiva] = useState<string | null>(null)

  const registrar = useCallback(
    (clave: string, fecha: ISODate | undefined, nodo: View | null) => {
      if (nodo) nodos.current.set(clave, { fecha, nodo })
      else nodos.current.delete(clave)
    },
    [],
  )

  const medir = useCallback(() => {
    const siguientes: Zona[] = []
    for (const [clave, { fecha, nodo }] of nodos.current) {
      medirNodo(nodo, (x, y, ancho, alto) => {
        siguientes.push({ clave, fecha, left: x, right: x + ancho, top: y, bottom: y + alto })
      })
    }
    medidas.current = siguientes
  }, [])

  /**
   * Both axes, not just the vertical one. Stacked as rows the days differ only
   * in Y, but laid out as columns they all share the same band of Y and differ
   * only in X — checking one axis finds the wrong day in one of the two
   * layouts, and silently.
   */
  const zonaEn = useCallback(
    (x: number, y: number) =>
      medidas.current.find(
        (z) => x >= z.left && x < z.right && y >= z.top && y < z.bottom,
      ) ?? null,
    [],
  )

  const limpiar = useCallback(() => {
    medidas.current = []
    setActiva(null)
  }, [])

  const valor = useMemo(
    () => ({ registrar, medir, zonaEn, activa, setActiva, limpiar }),
    [registrar, medir, zonaEn, activa, limpiar],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

/**
 * Null outside a provider rather than throwing: the same task rows are drawn
 * in places that have no days to drop onto, and there they simply do not move
 * between days.
 */
export const useZonas = (): Contexto | null => useContext(Ctx)
