import type { ColorToken, CategoriaCompromiso } from '../design/palette'
import type { HoraHHMM, ISODate } from '../lib/date'

export type { ColorToken, CategoriaCompromiso, HoraHHMM, ISODate }

export type Importancia = 'alta' | 'media' | 'baja'

export type TipoEvaluacion = 'prueba' | 'control' | 'entrega' | 'examen'

export interface Ramo {
  id: string
  nombre: string
  sigla?: string
  color: ColorToken
  /** Keeps finished semesters out of sight without a Semestre entity. */
  archivado: boolean
}

export interface Evaluacion {
  id: string
  ramoId: string
  titulo: string
  fecha: ISODate
  tipo: TipoEvaluacion
  importancia: Importancia
  descripcion?: string
}

export interface Recurrencia {
  frecuencia: 'diaria' | 'semanal' | 'mensual'
  /** Every N days/weeks/months. */
  intervalo: number
  /** 0-6, Sunday first. Only meaningful when frecuencia === 'semanal'. */
  diasSemana?: number[]
  hasta?: ISODate
  /** Cancelled occurrences. Occurrences are never materialized. */
  excepciones: ISODate[]
}

export interface Compromiso {
  id: string
  titulo: string
  /** Start date when recurrent. */
  fecha: ISODate
  hora?: HoraHHMM
  duracionMin?: number
  categoria: CategoriaCompromiso
  importancia: Importancia
  recurrencia?: Recurrencia
  /** Reserved: the MVP does not notify. Here so v2 needs no migration. */
  recordatorioMin?: number
}

export interface Tarea {
  id: string
  titulo: string
  /** Optional: loose tasks exist. */
  evaluacionId?: string
  /** Optional: undated tasks exist. */
  fecha?: ISODate
  hecha: boolean
  /**
   * Where you dragged it. One number per task, not one per list: every list of
   * tasks is a filtered subset of all of them, so a single relative order reads
   * the same everywhere and cannot contradict itself.
   *
   * Absent on a task never dragged — those keep sorting alphabetically, after
   * the ones that were placed by hand.
   */
  orden?: number
}

export type RefTipo = 'evaluacion' | 'compromiso' | 'tarea'

export interface BloqueTiempo {
  id: string
  fecha: ISODate
  horaInicio: HoraHHMM
  horaFin: HoraHHMM
  titulo: string
  /** Survives deletion of its target: the ref is cleared, the block stays. */
  ref?: { tipo: RefTipo; id: string }
}

/**
 * What the month grid consumes. The grid knows nothing about Evaluacion or
 * Compromiso — a selector normalizes both into this.
 */
export interface DatedItem {
  id: string
  fecha: ISODate
  titulo: string
  color: ColorToken
  importancia: Importancia
  esRecurrente: boolean
  origen: 'evaluacion' | 'compromiso'
  /** Only commitments have one, and only some of them. The month ignores it;
      the week orders the day by it. */
  hora?: HoraHHMM
}

/** The whole database, in memory. Hundreds of records, not thousands. */
export interface Dataset {
  ramos: Ramo[]
  evaluaciones: Evaluacion[]
  compromisos: Compromiso[]
  tareas: Tarea[]
  bloques: BloqueTiempo[]
}

export const emptyDataset = (): Dataset => ({
  ramos: [],
  evaluaciones: [],
  compromisos: [],
  tareas: [],
  bloques: [],
})

export const IMPORTANCIAS: Importancia[] = ['alta', 'media', 'baja']
export const TIPOS_EVALUACION: TipoEvaluacion[] = [
  'prueba',
  'control',
  'entrega',
  'examen',
]
