import { addDays, addMinutes } from 'date-fns'
import { parseISODate, toISODate, type ISODate } from '../lib/date'
import { toMinutos } from '../lib/time'
import type { Dataset } from '../model/types'
import { expandCompromisos } from './recurrence'
import { TIPO_LABEL } from '../design/labels'

/** An hour before the thing starts, per the rule the app promises. */
export const MINUTOS_ANTES = 60
/** A week before an evaluación: enough to still do something about it. */
export const DIAS_ANTES_EVALUACION = 7
/**
 * Evaluaciones carry no time of day, and neither do all-day compromisos.
 * 9am is when the day is still open enough for the warning to be useful.
 */
export const HORA_SIN_HORA = 9 * 60

/**
 * How far ahead recurring commitments are expanded. Android caps pending
 * alarms at around 500, so the horizon and MAX_AVISOS below are what keep a
 * daily commitment from eating the whole budget.
 */
export const HORIZONTE_DIAS = 90
export const MAX_AVISOS = 400

export interface Aviso {
  /**
   * Stable across reschedules: the same commitment on the same day always
   * produces the same id, so cancelling and rebuilding is idempotent.
   */
  id: string
  titulo: string
  cuerpo: string
  cuando: Date
}

/**
 * The full set of reminders the dataset implies, earliest first.
 *
 * Pure on purpose — the phone side just cancels everything and schedules what
 * this returns, which means the interesting half is testable in node.
 */
export function avisosDe(data: Dataset, ahora = new Date()): Aviso[] {
  const hasta = toISODate(addDays(ahora, HORIZONTE_DIAS))
  const avisos = [
    ...avisosDeEvaluaciones(data, hasta),
    ...avisosDeCompromisos(data, ahora, hasta),
    ...avisosDeBloques(data, hasta),
  ]

  return avisos
    .filter((aviso) => aviso.cuando > ahora)
    .sort((a, b) => a.cuando.getTime() - b.cuando.getTime())
    .slice(0, MAX_AVISOS)
}

function avisosDeEvaluaciones(data: Dataset, hasta: ISODate): Aviso[] {
  return data.evaluaciones
    .filter((evaluacion) => evaluacion.fecha <= hasta)
    .filter((evaluacion) => !ramoArchivado(data, evaluacion.ramoId))
    .map((evaluacion) => {
      const ramo = data.ramos.find((r) => r.id === evaluacion.ramoId)
      const tipo = TIPO_LABEL[evaluacion.tipo]
      return {
        id: `evaluacion:${evaluacion.id}`,
        titulo: `${tipo}: ${evaluacion.titulo}`,
        cuerpo: ramo ? `${ramo.nombre} — en una semana` : 'En una semana',
        cuando: enMomento(evaluacion.fecha, HORA_SIN_HORA, -DIAS_ANTES_EVALUACION * 24 * 60),
      }
    })
}

function avisosDeCompromisos(data: Dataset, ahora: Date, hasta: ISODate): Aviso[] {
  const range = { desde: toISODate(ahora), hasta }

  return expandCompromisos(data.compromisos, range).map(({ compromiso, fecha }) => {
    const conHora = compromiso.hora !== undefined
    return {
      // The date is part of the id: a recurring commitment is many reminders.
      id: `compromiso:${compromiso.id}:${fecha}`,
      titulo: compromiso.titulo,
      cuerpo: conHora ? `A las ${compromiso.hora}, en una hora` : 'Hoy',
      cuando: conHora
        ? enMomento(fecha, toMinutos(compromiso.hora as string), -MINUTOS_ANTES)
        : enMomento(fecha, HORA_SIN_HORA, 0),
    }
  })
}

function avisosDeBloques(data: Dataset, hasta: ISODate): Aviso[] {
  return data.bloques
    .filter((bloque) => bloque.fecha <= hasta)
    .map((bloque) => ({
      id: `bloque:${bloque.id}`,
      titulo: bloque.titulo,
      cuerpo: `A las ${bloque.horaInicio}, en una hora`,
      cuando: enMomento(bloque.fecha, toMinutos(bloque.horaInicio), -MINUTOS_ANTES),
    }))
}

/** A local Date at `fecha` + `minutosDelDia`, shifted by `desplazamiento`. */
function enMomento(fecha: ISODate, minutosDelDia: number, desplazamiento: number): Date {
  return addMinutes(parseISODate(fecha), minutosDelDia + desplazamiento)
}

const ramoArchivado = (data: Dataset, ramoId: string): boolean =>
  data.ramos.find((r) => r.id === ramoId)?.archivado === true
