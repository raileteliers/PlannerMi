import { CATEGORY_COLOR, type ColorToken } from '../design/palette'
import type { HoraHHMM, ISODate } from '../lib/date'
import { toMinutos } from '../lib/time'
import type { BloqueTiempo, Compromiso, Dataset, Evaluacion, Tarea } from '../model/types'
import { expandCompromiso } from './recurrence'
import { ramoById } from '../store/selectors'

/** 07:00 to 23:00 in 30-minute slots. A bet, per DESIGN.md §7. */
export const TIMELINE_INICIO_MIN = 7 * 60
export const TIMELINE_FIN_MIN = 23 * 60
export const SLOT_MIN = 30
export const SLOTS = (TIMELINE_FIN_MIN - TIMELINE_INICIO_MIN) / SLOT_MIN

export const DURACION_BLOQUE_DEFECTO_MIN = 60
/** Where "Agendar" lands when the evening is free: after dinner-ish. */
const HORA_SUGERIDA_MIN = 18 * 60

export interface EntradaTimeline {
  id: string
  titulo: string
  inicioMin: number
  finMin: number
  /** Commitments are shown but not editable here; blocks are yours to move. */
  tipo: 'bloque' | 'compromiso'
  color?: ColorToken
  esRecurrente: boolean
  bloque?: BloqueTiempo
}

/** Blocks you created plus commitments that have an hour, in time order. */
export function entradasDelTimeline(data: Dataset, fecha: ISODate): EntradaTimeline[] {
  const bloques = data.bloques
    .filter((b) => b.fecha === fecha)
    .map(
      (bloque): EntradaTimeline => ({
        id: bloque.id,
        titulo: bloque.titulo,
        inicioMin: toMinutos(bloque.horaInicio),
        finMin: toMinutos(bloque.horaFin),
        tipo: 'bloque',
        ...(colorDeRef(data, bloque) ? { color: colorDeRef(data, bloque) } : {}),
        esRecurrente: false,
        bloque,
      }),
    )

  const compromisos = data.compromisos
    .filter(
      (c) => c.hora !== undefined && expandCompromiso(c, { desde: fecha, hasta: fecha }).length > 0,
    )
    .map((compromiso): EntradaTimeline => {
      const inicioMin = toMinutos(compromiso.hora as HoraHHMM)
      return {
        id: `${compromiso.id}:${fecha}`,
        titulo: compromiso.titulo,
        inicioMin,
        finMin: inicioMin + (compromiso.duracionMin ?? SLOT_MIN),
        tipo: 'compromiso',
        color: CATEGORY_COLOR[compromiso.categoria],
        esRecurrente: compromiso.recurrencia !== undefined,
      }
    })

  return [...bloques, ...compromisos].sort(
    (a, b) => a.inicioMin - b.inicioMin || a.finMin - b.finMin,
  )
}

/** A block pointing at something borrows its color; a loose block is gray. */
function colorDeRef(data: Dataset, bloque: BloqueTiempo): ColorToken | undefined {
  if (!bloque.ref) return undefined
  if (bloque.ref.tipo === 'evaluacion') {
    const evaluacion = data.evaluaciones.find((e) => e.id === bloque.ref?.id)
    return evaluacion ? ramoById(data, evaluacion.ramoId)?.color : undefined
  }
  if (bloque.ref.tipo === 'compromiso') {
    const compromiso = data.compromisos.find((c) => c.id === bloque.ref?.id)
    return compromiso ? CATEGORY_COLOR[compromiso.categoria] : undefined
  }
  return undefined
}

export interface EntradaUbicada {
  entrada: EntradaTimeline
  columna: number
  columnas: number
}

/**
 * Overlapping entries share the width instead of hiding each other. Entries
 * are grouped into runs that overlap transitively, and every entry in a run
 * gets the same column count so the edges line up.
 */
export function ubicarEntradas(entradas: EntradaTimeline[]): EntradaUbicada[] {
  const ubicadas: EntradaUbicada[] = []
  let grupo: EntradaTimeline[] = []
  let finDelGrupo = -1

  const cerrarGrupo = () => {
    if (grupo.length === 0) return
    const columnas: number[] = [] // last end time per column
    const asignadas = grupo.map((entrada) => {
      let columna = columnas.findIndex((fin) => fin <= entrada.inicioMin)
      if (columna === -1) {
        columna = columnas.length
        columnas.push(entrada.finMin)
      } else {
        columnas[columna] = entrada.finMin
      }
      return { entrada, columna }
    })
    for (const { entrada, columna } of asignadas) {
      ubicadas.push({ entrada, columna, columnas: columnas.length })
    }
    grupo = []
    finDelGrupo = -1
  }

  for (const entrada of entradas) {
    if (grupo.length > 0 && entrada.inicioMin >= finDelGrupo) cerrarGrupo()
    grupo.push(entrada)
    finDelGrupo = Math.max(finDelGrupo, entrada.finMin)
  }
  cerrarGrupo()

  return ubicadas
}

/**
 * The first free half-hour for a new block: from 18:00 if the evening is
 * open, otherwise the first gap in the day.
 */
export function slotSugerido(entradas: EntradaTimeline[]): number {
  const ocupado = (inicio: number) =>
    entradas.some((e) => inicio < e.finMin && inicio + DURACION_BLOQUE_DEFECTO_MIN > e.inicioMin)

  for (const desde of [HORA_SUGERIDA_MIN, TIMELINE_INICIO_MIN]) {
    for (let inicio = desde; inicio + SLOT_MIN <= TIMELINE_FIN_MIN; inicio += SLOT_MIN) {
      if (!ocupado(inicio)) return inicio
    }
  }
  return HORA_SUGERIDA_MIN
}

/** What the top strip holds: the day's whats, with no hour of their own. */
export interface FranjaSuperior {
  evaluaciones: Evaluacion[]
  tareas: Tarea[]
  compromisosSinHora: Compromiso[]
}

export function franjaSuperior(data: Dataset, fecha: ISODate): FranjaSuperior {
  return {
    evaluaciones: data.evaluaciones
      .filter((e) => e.fecha === fecha && ramoById(data, e.ramoId)?.archivado === false)
      .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es')),
    tareas: data.tareas
      .filter((t) => t.fecha === fecha)
      .sort((a, b) =>
        a.hecha === b.hecha
          ? a.titulo.localeCompare(b.titulo, 'es')
          : Number(a.hecha) - Number(b.hecha),
      ),
    compromisosSinHora: data.compromisos.filter(
      (c) => c.hora === undefined && expandCompromiso(c, { desde: fecha, hasta: fecha }).length > 0,
    ),
  }
}

export const franjaVacia = (franja: FranjaSuperior): boolean =>
  franja.evaluaciones.length === 0 &&
  franja.tareas.length === 0 &&
  franja.compromisosSinHora.length === 0
