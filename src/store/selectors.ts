import { todayISO } from '../lib/date'
import type { Dataset, Evaluacion, Ramo, Tarea } from '../model/types'
import { compararTareas } from '../logic/taskOrder'

/**
 * Alphabetical, because SQLite hands rows back in primary-key order and the
 * keys are UUIDs — without a sort the list reshuffles on reload.
 */
const porNombre = (a: Ramo, b: Ramo) => a.nombre.localeCompare(b.nombre, 'es')

/** Active ramos first; archived ones live in their own section. */
export const ramosActivos = (data: Dataset): Ramo[] =>
  data.ramos.filter((r) => !r.archivado).sort(porNombre)

export const ramosArchivados = (data: Dataset): Ramo[] =>
  data.ramos.filter((r) => r.archivado).sort(porNombre)

export const ramoById = (data: Dataset, id: string): Ramo | undefined =>
  data.ramos.find((r) => r.id === id)

/** Sorted by date: the order the semester actually happens in. */
export const evaluacionesDeRamo = (data: Dataset, ramoId: string): Evaluacion[] =>
  data.evaluaciones
    .filter((e) => e.ramoId === ramoId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

/** What the list counter shows: evaluaciones from today onwards. */
export const pendientesDeRamo = (
  data: Dataset,
  ramoId: string,
  hoy = todayISO(),
): number => data.evaluaciones.filter((e) => e.ramoId === ramoId && e.fecha >= hoy).length

/** Pending first, then alphabetical: same reason as the ramo list. */
export const tareasDeEvaluacion = (data: Dataset, evaluacionId: string): Tarea[] =>
  data.tareas
    .filter((t) => t.evaluacionId === evaluacionId)
    .sort(compararTareas)

/** The next unused color, so four ramos in a row never repeat. */
export function siguienteColorLibre<T extends string>(
  paleta: T[],
  usados: T[],
): T {
  const libre = paleta.find((color) => !usados.includes(color))
  return libre ?? (paleta[usados.length % paleta.length] as T)
}
