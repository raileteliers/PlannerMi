import type { Tarea } from '../model/types'

/**
 * The one order tasks are listed in, everywhere.
 *
 * Three keys, in this order:
 *
 * - done last, because a closed task is not something you are deciding about;
 * - then where you dragged it;
 * - then the title, which is what a task never dragged falls back to.
 *
 * A task with no `orden` sorts after every task that has one. That is what
 * makes the first drag in a list feel like nothing moved except the thing you
 * moved: the placed ones rise to the top in the order you placed them, and the
 * rest keep the alphabetical order they already had.
 */
export const compararTareas = (a: Tarea, b: Tarea): number =>
  Number(a.hecha) - Number(b.hecha) ||
  ordenDe(a) - ordenDe(b) ||
  a.titulo.localeCompare(b.titulo, 'es')

/**
 * Never `Infinity`: two unplaced tasks would subtract to `NaN`, and a `NaN`
 * comparator does not sort, it scrambles.
 */
const ordenDe = (tarea: Tarea): number => tarea.orden ?? Number.MAX_SAFE_INTEGER

export const ordenadas = (tareas: Tarea[]): Tarea[] => [...tareas].sort(compararTareas)

/** What a drop changes: the tasks whose `orden` is not what it was. */
export interface CambioDeOrden {
  id: string
  orden: number
}

/**
 * Move the task at `desde` to `hasta`, and hand back what has to be written.
 *
 * The whole visible list is renumbered 0..n-1 rather than the moved task being
 * given a number between its new neighbours. Numbering between neighbours needs
 * fractions, and fractions run out of precision after enough drags in the same
 * spot — a bug that only shows up for the person who uses the feature most.
 *
 * Only the tasks that actually changed come back, so a drag between two
 * neighbours writes two rows and not the whole list.
 */
export function reordenar(
  visibles: Tarea[],
  desde: number,
  hasta: number,
): CambioDeOrden[] {
  if (desde === hasta) return []
  if (desde < 0 || desde >= visibles.length) return []
  if (hasta < 0 || hasta >= visibles.length) return []

  const movidas = [...visibles]
  const [movida] = movidas.splice(desde, 1)
  if (!movida) return []
  movidas.splice(hasta, 0, movida)

  return movidas.flatMap((tarea, orden) => (tarea.orden === orden ? [] : [{ id: tarea.id, orden }]))
}

/**
 * Where a dragged row ends up, given how far it travelled.
 *
 * Rows are a fixed height inside one list, so the index is the offset divided
 * by that height. Kept here rather than in the component so it can be tested
 * without a gesture.
 */
export function indiceDestino(
  desde: number,
  desplazamientoPx: number,
  alturaFilaPx: number,
  total: number,
): number {
  if (alturaFilaPx <= 0) return desde
  const destino = desde + Math.round(desplazamientoPx / alturaFilaPx)
  return Math.max(0, Math.min(total - 1, destino))
}

/**
 * Where a task lands when it is dropped on another day.
 *
 * At the end of what that day already holds, not at the top. The move this
 * exists for is "I did not get to this, push it to tomorrow" — and something
 * pushed to tomorrow is not suddenly the first thing you do tomorrow.
 *
 * `orden` is reassigned rather than carried over: a task dragged to the top of
 * Monday last week would otherwise jump to the top of whatever day it lands on,
 * which is a position nobody asked for in that day.
 */
export function ordenAlFinalDe(tareasDelDestino: Tarea[]): number {
  const ordenes = tareasDelDestino.flatMap((t) => (t.orden === undefined ? [] : [t.orden]))
  return ordenes.length === 0 ? 0 : Math.max(...ordenes) + 1
}

/**
 * What changes when a task is dropped on a day. `fecha: undefined` is the
 * loose pile, which is a real destination and not a missing value — dragging
 * something out of the week is how you say "not this week, but not gone".
 */
export interface MovimientoDeDia {
  fecha: string | undefined
  orden: number
}

export const moverADia = (
  tareasDelDestino: Tarea[],
  fecha: string | undefined,
): MovimientoDeDia => ({ fecha, orden: ordenAlFinalDe(tareasDelDestino) })
