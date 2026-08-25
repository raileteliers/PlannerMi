import { CATEGORY_COLOR } from '../design/palette'
import type { ISODate } from '../lib/date'
import type {
  Dataset,
  DatedItem,
  Evaluacion,
  Importancia,
  Ramo,
  Tarea,
} from '../model/types'
import { expandCompromiso, type DateRange } from './recurrence'
import { compararTareas } from './taskOrder'

/** The grid never shows more than this many bars in one cell. */
export const MAX_BARRAS = 4

/**
 * How thick a bar is drawn. Two inputs, both of them information:
 *
 * - importancia gives the bar its weight, so in a day holding three things
 *   you can see which one is the one that matters;
 * - how crowded the day is shrinks everything together, so a loaded day reads
 *   as denser and finer rather than as a cell that outgrew itself.
 *
 * Kept to whole pixels between 2 and 6: below 2 a bar stops being a bar, and
 * above 6 the cell starts looking like a chart.
 */
const ALTURA_BASE_PX: Record<Importancia, number> = { alta: 6, media: 4, baja: 3 }

const APRIETE = [1, 1, 0.85, 0.7] as const

export function alturaBarraPx(importancia: Importancia, itemsEseDia: number): number {
  const factor = APRIETE[Math.min(Math.max(itemsEseDia, 1), MAX_BARRAS) - 1] ?? 0.7
  return Math.max(2, Math.min(6, Math.round(ALTURA_BASE_PX[importancia] * factor)))
}

/** The gap between bars tightens with the same crowding. */
export const separacionBarrasPx = (itemsEseDia: number): number =>
  itemsEseDia >= MAX_BARRAS ? 2 : itemsEseDia === 3 ? 3 : 4

/**
 * Everything the month grid needs, flattened into one shape. The grid does
 * not know that Evaluacion or Compromiso exist.
 *
 * Evaluaciones of archived ramos are left out: an archived ramo disappears
 * from the month but keeps its data.
 */
export function datedItemsEnRango(data: Dataset, range: DateRange): DatedItem[] {
  const ramos = new Map(data.ramos.map((r) => [r.id, r]))

  const evaluaciones = data.evaluaciones.flatMap((evaluacion) => {
    const ramo = ramos.get(evaluacion.ramoId)
    if (!ramo || ramo.archivado) return []
    if (evaluacion.fecha < range.desde || evaluacion.fecha > range.hasta) return []
    return [desdeEvaluacion(evaluacion, ramo)]
  })

  const compromisos = data.compromisos.flatMap((compromiso) =>
    expandCompromiso(compromiso, range).map(
      (fecha): DatedItem => ({
        // One id per occurrence: the same commitment appears many times.
        id: `${compromiso.id}:${fecha}`,
        fecha,
        titulo: compromiso.titulo,
        color: CATEGORY_COLOR[compromiso.categoria],
        importancia: compromiso.importancia,
        esRecurrente: compromiso.recurrencia !== undefined,
        origen: 'compromiso',
        ...(compromiso.hora ? { hora: compromiso.hora } : {}),
      }),
    ),
  )

  return [...evaluaciones, ...compromisos]
}

const desdeEvaluacion = (evaluacion: Evaluacion, ramo: Ramo): DatedItem => ({
  id: evaluacion.id,
  fecha: evaluacion.fecha,
  titulo: evaluacion.titulo,
  color: ramo.color,
  importancia: evaluacion.importancia,
  esRecurrente: false,
  origen: 'evaluacion',
})

/**
 * Grouped by day and ordered the way the bars stack: what is exceptional
 * first, routine last. Evaluaciones, then one-off commitments, then
 * recurring ones.
 */
export function itemsPorFecha(
  data: Dataset,
  range: DateRange,
): Map<ISODate, DatedItem[]> {
  const porFecha = new Map<ISODate, DatedItem[]>()
  for (const item of datedItemsEnRango(data, range)) {
    const dia = porFecha.get(item.fecha)
    if (dia) dia.push(item)
    else porFecha.set(item.fecha, [item])
  }
  for (const items of porFecha.values()) items.sort(porPeso)
  return porFecha
}

const peso = (item: DatedItem): number =>
  item.origen === 'evaluacion' ? 0 : item.esRecurrente ? 2 : 1

const porPeso = (a: DatedItem, b: DatedItem): number =>
  peso(a) - peso(b) || a.titulo.localeCompare(b.titulo, 'es')

/** Red day number: any item that day is high importance. */
export const tieneImportanciaAlta = (items: DatedItem[]): boolean =>
  items.some((item) => item.importancia === 'alta')

/** Tasks are not bars in the grid, but they do show up in the day sheet. */
export const tareasDelDia = (data: Dataset, fecha: ISODate): Tarea[] =>
  data.tareas
    .filter((t) => t.fecha === fecha)
    .sort(compararTareas)
