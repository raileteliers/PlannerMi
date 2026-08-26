import { addDays, eachDayOfInterval, format, isSameMonth, isSameYear, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

import { parseISODate, toISODate, type ISODate } from '../lib/date'
import type { Dataset, DatedItem, Tarea } from '../model/types'
import { datedItemsEnRango, tareasDelDia } from './monthItems'
import { compararTareas } from './taskOrder'

/** Monday first, the way a Chilean calendar reads. Same as the month grid. */
const WEEK_OPTIONS = { weekStartsOn: 1 } as const

export const DIAS_SEMANA = 7

/** The seven dates of the week `fecha` falls in, Monday to Sunday. */
export function semanaDe(fecha: ISODate): ISODate[] {
  const lunes = startOfWeek(parseISODate(fecha), WEEK_OPTIONS)
  return eachDayOfInterval({ start: lunes, end: addDays(lunes, DIAS_SEMANA - 1) }).map(toISODate)
}

/** Move whole weeks without leaving the Monday. */
export const semanaVecina = (fecha: ISODate, delta: number): ISODate =>
  toISODate(addDays(startOfWeek(parseISODate(fecha), WEEK_OPTIONS), delta * DIAS_SEMANA))

/**
 * One day, with everything the week screen shows for it: what is scheduled
 * and what there is to do. Tasks are not items — they carry no color and no
 * importance — so they stay in their own list instead of being flattened in.
 */
export interface DiaDeSemana {
  fecha: ISODate
  items: DatedItem[]
  tareas: Tarea[]
}

/**
 * The whole week in one pass. The range query runs once for the seven days
 * rather than once per day: recurring commitments are expanded, and expanding
 * them seven times over is the one thing here that is not cheap.
 */
export function entradasDeSemana(data: Dataset, dias: ISODate[]): DiaDeSemana[] {
  const primero = dias[0]
  const ultimo = dias[dias.length - 1]
  if (!primero || !ultimo) return []

  const porFecha = new Map<ISODate, DatedItem[]>()
  for (const item of datedItemsEnRango(data, { desde: primero, hasta: ultimo })) {
    const dia = porFecha.get(item.fecha)
    if (dia) dia.push(item)
    else porFecha.set(item.fecha, [item])
  }

  return dias.map((fecha) => ({
    fecha,
    items: (porFecha.get(fecha) ?? []).sort(porHora),
    tareas: tareasDelDia(data, fecha),
  }))
}

/**
 * The week reads as a schedule, so time comes first — unlike the month grid,
 * which stacks by weight because a bar has no hour to show. Whatever has no
 * hour sinks to the bottom of the day.
 */
const porHora = (a: DatedItem, b: DatedItem): number =>
  (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99') ||
  a.titulo.localeCompare(b.titulo, 'es')

/**
 * Tasks with no date at all. They belong to no day — putting them under
 * Monday for lack of anywhere else would be inventing a date for them — so
 * the week shows them in their own strip, as the pile you deal things out of.
 *
 * Pending first, so the ones already done sink under the fold on their own
 * and the strip needs no rule for hiding them.
 */
export const tareasSinFecha = (data: Dataset): Tarea[] =>
  data.tareas
    .filter((t) => t.fecha === undefined)
    .sort(compararTareas)

/** How many of them the strip shows before it has to be opened. */
export const SIN_FECHA_VISIBLES = 2

export const diaVacio = (dia: DiaDeSemana): boolean =>
  dia.items.length === 0 && dia.tareas.length === 0

export const semanaVacia = (dias: DiaDeSemana[]): boolean => dias.every(diaVacio)

/** Pending tasks across the week: the number the header carries. */
export const tareasPendientes = (dias: DiaDeSemana[]): number =>
  dias.reduce((total, dia) => total + dia.tareas.filter((t) => !t.hecha).length, 0)

/**
 * '25 – 31 de agosto', or '29 de sep – 5 de oct' when the week straddles two
 * months, or with both years when it straddles two. The month is written once
 * whenever writing it twice would say the same thing twice.
 */
export function rangoSemanaLabel(dias: ISODate[]): string {
  const primero = dias[0]
  const ultimo = dias[dias.length - 1]
  if (!primero || !ultimo) return ''

  const inicio = parseISODate(primero)
  const fin = parseISODate(ultimo)

  if (!isSameYear(inicio, fin)) {
    return `${fmt(inicio, "d 'de' MMM yyyy")} – ${fmt(fin, "d 'de' MMM yyyy")}`
  }
  if (!isSameMonth(inicio, fin)) {
    return `${fmt(inicio, "d 'de' MMM")} – ${fmt(fin, "d 'de' MMM")}`
  }
  return `${fmt(inicio, 'd')} – ${fmt(fin, "d 'de' MMMM")}`
}

const fmt = (date: Date, pattern: string): string =>
  format(date, pattern, { locale: es }).replace(/\./g, '')

/**
 * The one line a folded day shows: what it holds, without opening it.
 *
 * Seven bare dates would mean opening each day to find out whether it has
 * anything in it, which is the opposite of having the week on one plane. The
 * titles first, because that is what you are scanning for, and the tasks as a
 * count, because a task title is not what you are scanning for.
 */
export function resumenDelDia(dia: DiaDeSemana): string {
  const partes = dia.items.map((i) => i.titulo)
  const pendientes = dia.tareas.filter((t) => !t.hecha).length
  if (pendientes > 0) partes.push(pendientes === 1 ? '1 tarea' : `${pendientes} tareas`)

  // Everything done still deserves saying: a day with three closed tasks is
  // not the same as an empty one.
  if (partes.length === 0 && dia.tareas.length > 0) return 'todo hecho'
  return partes.join(" \u00b7 ")
}
