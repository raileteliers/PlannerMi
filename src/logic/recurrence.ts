import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  getDate,
  getDay,
  startOfWeek,
} from 'date-fns'
import { parseISODate, toISODate, type ISODate } from '../lib/date'
import type { Compromiso, Recurrencia } from '../model/types'

/** Sunday-first, matching Recurrencia.diasSemana (0-6). */
const WEEK_OPTIONS = { weekStartsOn: 0 } as const

/** Guard against a bad intervalo turning an expansion into an infinite loop. */
const MAX_OCCURRENCES = 2000

export interface DateRange {
  desde: ISODate
  hasta: ISODate
}

/**
 * Expand a commitment into the dates it actually falls on inside a range.
 *
 * Occurrences are never stored: this runs on every query. `excepciones` are
 * subtracted and `recurrencia.hasta` caps the series.
 */
export function expandCompromiso(compromiso: Compromiso, range: DateRange): ISODate[] {
  const { recurrencia } = compromiso
  if (!recurrencia) {
    return withinRange(compromiso.fecha, range) ? [compromiso.fecha] : []
  }

  const excepciones = new Set(recurrencia.excepciones)
  const seriesEnd = earliest(range.hasta, recurrencia.hasta)
  if (!seriesEnd || seriesEnd < compromiso.fecha) return []

  const raw = occurrences(compromiso.fecha, recurrencia, range.desde, seriesEnd)
  return raw.filter((fecha) => fecha >= range.desde && !excepciones.has(fecha))
}

/** Same thing for a list, flattened into (compromiso, fecha) pairs. */
export function expandCompromisos(
  compromisos: Compromiso[],
  range: DateRange,
): Array<{ compromiso: Compromiso; fecha: ISODate }> {
  return compromisos.flatMap((compromiso) =>
    expandCompromiso(compromiso, range).map((fecha) => ({ compromiso, fecha })),
  )
}

function occurrences(
  inicio: ISODate,
  recurrencia: Recurrencia,
  rangeStart: ISODate,
  end: ISODate,
): ISODate[] {
  const intervalo = Math.max(1, Math.floor(recurrencia.intervalo))
  const start = parseISODate(inicio)
  const endDate = parseISODate(end)
  const rangeStartDate = parseISODate(rangeStart)
  const out: ISODate[] = []

  switch (recurrencia.frecuencia) {
    case 'diaria': {
      // Skip straight to the first occurrence inside the range.
      const behind = differenceInCalendarDays(rangeStartDate, start)
      const steps = behind > 0 ? Math.ceil(behind / intervalo) : 0
      let cursor = addDays(start, steps * intervalo)
      while (cursor <= endDate && out.length < MAX_OCCURRENCES) {
        out.push(toISODate(cursor))
        cursor = addDays(cursor, intervalo)
      }
      return out
    }

    case 'semanal': {
      const dias = normalizeDays(recurrencia.diasSemana, getDay(start))
      const baseWeek = startOfWeek(start, WEEK_OPTIONS)
      const behind = differenceInCalendarWeeks(
        startOfWeek(rangeStartDate, WEEK_OPTIONS),
        baseWeek,
        WEEK_OPTIONS,
      )
      const steps = behind > 0 ? Math.floor(behind / intervalo) : 0
      let week = addWeeks(baseWeek, steps * intervalo)
      while (week <= endDate && out.length < MAX_OCCURRENCES) {
        for (const dia of dias) {
          const date = addDays(week, dia)
          if (date >= start && date <= endDate) out.push(toISODate(date))
        }
        week = addWeeks(week, intervalo)
      }
      return out
    }

    case 'mensual': {
      const diaDelMes = getDate(start)
      const behind = differenceInCalendarMonths(rangeStartDate, start)
      let step = behind > 0 ? Math.floor(behind / intervalo) : 0
      // Always measured from `start`: stepping off the previous occurrence
      // would let a clamped month (Jan 31 -> Feb 28) drift the whole series.
      for (; out.length < MAX_OCCURRENCES; step++) {
        const month = addMonths(start, step * intervalo)
        if (month > endDate) break
        // A clamped date lands on a different day of the month, which means
        // that month simply has no occurrence.
        if (getDate(month) === diaDelMes && month >= start) out.push(toISODate(month))
      }
      return out
    }
  }
}

function normalizeDays(dias: number[] | undefined, fallback: number): number[] {
  const valid = (dias ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  const unique = [...new Set(valid.length > 0 ? valid : [fallback])]
  return unique.sort((a, b) => a - b)
}

const withinRange = (fecha: ISODate, range: DateRange): boolean =>
  fecha >= range.desde && fecha <= range.hasta

/** ISODate strings sort lexicographically, so the earlier one is the smaller. */
const earliest = (a: ISODate, b?: ISODate): ISODate | undefined =>
  b === undefined ? a : a < b ? a : b
