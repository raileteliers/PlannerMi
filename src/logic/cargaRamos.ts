import { differenceInCalendarDays } from 'date-fns'
import { parseISODate, todayISO, type ISODate } from '../lib/date'
import type { Dataset, Evaluacion, Importancia, Ramo, TipoEvaluacion } from '../model/types'

/**
 * How heavy each ramo is right now, and why.
 *
 * The month answers "what is happening"; this answers "what should I be
 * working on tonight". Three things move a ramo up: an evaluación that
 * matters, one that is hard, and one that is close — multiplied, not added,
 * so a hard exam next week outranks three easy controls next month rather
 * than being averaged down by them.
 */

/** How much it costs you. Derived from the type: no field to fill in. */
const DIFICULTAD: Record<TipoEvaluacion, number> = {
  examen: 3,
  prueba: 2,
  control: 1.5,
  entrega: 1,
}

/** How much it costs your grade. The same three levels the app already has. */
const PESO_IMPORTANCIA: Record<Importancia, number> = {
  alta: 3,
  media: 1.75,
  baja: 1,
}

/**
 * Days until a thing weighs half of what it weighs today. Continuous, so the
 * ranking drifts a little each day instead of jumping when something crosses
 * a boundary — a list that reorders itself overnight is a list you stop
 * trusting.
 */
export const VIDA_MEDIA_DIAS = 7

/** 1 today, 0.5 in a week, 0.25 in a fortnight, near nothing past a month. */
export function proximidad(diasFaltantes: number): number {
  return 2 ** (-Math.max(0, diasFaltantes) / VIDA_MEDIA_DIAS)
}

export const pesoEvaluacion = (evaluacion: Evaluacion, diasFaltantes: number): number =>
  PESO_IMPORTANCIA[evaluacion.importancia] *
  DIFICULTAD[evaluacion.tipo] *
  proximidad(diasFaltantes)

/** One evaluación and what it contributes, so the screen can show the parts. */
export interface PesoEvaluacion {
  evaluacion: Evaluacion
  /** Calendar days from today. Zero is today; never negative. */
  dias: number
  peso: number
}

export interface CargaRamo {
  ramo: Ramo
  /** Unbounded: only ever compared against the other ramos on screen. */
  puntaje: number
  /**
   * Everything still ahead, soonest first. The collapsed row reads the first
   * one; expanding shows all of them. `puntaje` is exactly the sum of their
   * `peso`, which is what lets the expanded bars add up to the ramo's own.
   */
  desglose: PesoEvaluacion[]
}

/**
 * Every live ramo, heaviest first. Archived ramos are left out for the same
 * reason they leave the month: they are not part of this semester.
 *
 * Ramos with nothing ahead score zero and stay in the list, at the bottom —
 * "nothing due" is an answer, and dropping them would make the screen lie
 * about how many ramos you have.
 */
export function cargaDeRamos(data: Dataset, hoy: ISODate = todayISO()): CargaRamo[] {
  const hoyDate = parseISODate(hoy)

  const cargas = data.ramos
    .filter((ramo) => !ramo.archivado)
    .map((ramo): CargaRamo => {
      // Today counts: an evaluación is ahead of you until the day is over.
      const desglose = data.evaluaciones
        .filter((e) => e.ramoId === ramo.id && e.fecha >= hoy)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((evaluacion): PesoEvaluacion => {
          const dias = differenceInCalendarDays(parseISODate(evaluacion.fecha), hoyDate)
          return { evaluacion, dias, peso: pesoEvaluacion(evaluacion, dias) }
        })

      return {
        ramo,
        puntaje: desglose.reduce((total, parte) => total + parte.peso, 0),
        desglose,
      }
    })

  // Alphabetical as the tie-break, so ramos with nothing ahead — all tied at
  // zero — hold a stable order instead of reshuffling on every render.
  return cargas.sort(
    (a, b) => b.puntaje - a.puntaje || a.ramo.nombre.localeCompare(b.ramo.nombre, 'es'),
  )
}

/**
 * Bar length as a fraction of the heaviest ramo. Relative on purpose: the
 * absolute number means nothing on its own, and the question the screen
 * answers is which ramo is worse than which.
 */
export function proporcion(puntaje: number, maximo: number): number {
  if (maximo <= 0) return 0
  return Math.max(0, Math.min(1, puntaje / maximo))
}
