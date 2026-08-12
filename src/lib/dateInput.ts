import { addMonths, format, getYear, isBefore, setYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { parseISODate, toISODate, type ISODate } from './date'

/**
 * Loading a semester means typing a dozen dates in a row with the academic
 * calendar next to you. A native date picker costs three taps each; this
 * takes "12/9" and Enter.
 *
 * Accepts d/m, d/m/yy, d/m/yyyy with / - . or space as separator.
 */
export function parseFechaCorta(input: string, hoy = new Date()): ISODate | null {
  const limpio = input.trim()
  if (limpio === '') return null

  const partes = limpio.split(/[/\-. ]+/).filter((p) => p !== '')
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
