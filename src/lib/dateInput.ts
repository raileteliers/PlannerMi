import { addMonths, format, getYear, isBefore, setYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { parseISODate, toISODate, type ISODate } from './date'

/**
 * Loading a semester means typing a dozen dates in a row with the academic
 * calendar next to you. A native date picker costs three taps each; this
 * takes "12/9" and Enter.
 *
 * Accepts d/m, d/m/yy, d/m/yyyy with / - . , or space as separator, and the
 * same date with no separator at all: "1209", "120927", "12092027".
 *
 * The separator-less form is the one that matters on Android, where the number
 * pad shows a decimal key but the field filters it out — there is no way to
 * type a separator. It mirrors what parseHoraCorta already does with "1930".
 */
export function parseFechaCorta(input: string, hoy = new Date()): ISODate | null {
  const limpio = input.trim()
  if (limpio === '') return null

  let partes = limpio.split(/[/\-., ]+/).filter((p) => p !== '')
  if (partes.length === 1) {
    const expandido = expandirCompacto(partes[0] as string)
    if (expandido === null) return null
    partes = expandido
  }
  if (partes.length < 2 || partes.length > 3) return null
  if (partes.some((p) => !/^\d{1,4}$/.test(p))) return null

  const dia = Number(partes[0])
  const mes = Number(partes[1])
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null

  const anio = resolverAnio(partes[2], dia, mes, hoy)
  if (anio === null) return null

  const fecha = new Date(anio, mes - 1, dia)
  // Rejects 31/02 and friends: the Date would roll over to March.
  if (fecha.getDate() !== dia || fecha.getMonth() !== mes - 1) return null

  return toISODate(fecha)
}

/**
 * Splits "1209" into ['12', '09']. Both day and month must be two digits: at
 * three digits "112" could be 1/12 or 11/2 with nothing to choose between them,
 * so it is refused rather than guessed at.
 */
function expandirCompacto(solo: string): string[] | null {
  if (!/^\d+$/.test(solo)) return null
  const dia = solo.slice(0, 2)
  const mes = solo.slice(2, 4)

  if (solo.length === 4) return [dia, mes]
  if (solo.length === 6 || solo.length === 8) return [dia, mes, solo.slice(4)]
  return null
}

/**
 * With no year typed, assume the one that puts the date near today: a date
 * more than three months past belongs to next year (loading March in
 * December), not to the one that just ended.
 */
function resolverAnio(
  parte: string | undefined,
  dia: number,
  mes: number,
  hoy: Date,
): number | null {
  if (parte !== undefined) {
    const n = Number(parte)
    if (parte.length === 4) return n
    if (parte.length <= 2) return 2000 + n
    return null
  }

  const anioActual = getYear(hoy)
  const candidato = new Date(anioActual, mes - 1, dia)
  return isBefore(candidato, addMonths(hoy, -3)) ? anioActual + 1 : anioActual
}

/** 'vie 12 sep' — short enough for a collapsed row. */
export const formatFechaCorta = (iso: ISODate): string =>
  format(parseISODate(iso), 'EEE d MMM', { locale: es })

/** '12/9' — what parseFechaCorta would take back. */
export const formatFechaEditable = (iso: ISODate, hoy = new Date()): string => {
  const fecha = parseISODate(iso)
  const mismoAnio = getYear(fecha) === getYear(hoy)
  return format(mismoAnio ? fecha : setYear(fecha, getYear(fecha)), mismoAnio ? 'd/M' : 'd/M/yyyy')
}
