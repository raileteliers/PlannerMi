import { toHoraHHMM } from '../../lib/time'
import { DURACION_BLOQUE_DEFECTO_MIN, TIMELINE_FIN_MIN } from '../../logic/dayTimeline'
import type { BloqueTiempo, RefTipo } from '../../model/types'

/** What the block sheet edits, before it becomes a BloqueTiempo. */
export interface BloqueBorrador {
  /** Present when editing an existing block. */
  id?: string
  titulo: string
  horaInicio: string
  horaFin: string
  ref?: { tipo: RefTipo; id: string }
}

export const borradorNuevo = (
  inicioMin: number,
  titulo = '',
  ref?: { tipo: RefTipo; id: string },
): BloqueBorrador => ({
  titulo,
  horaInicio: toHoraHHMM(inicioMin),
  // The last slot of the day proposes 22:30-23:00, not a block that spills
  // past the end of the timeline.
  horaFin: toHoraHHMM(Math.min(inicioMin + DURACION_BLOQUE_DEFECTO_MIN, TIMELINE_FIN_MIN)),
  ...(ref ? { ref } : {}),
})

export const borradorDe = (bloque: BloqueTiempo): BloqueBorrador => ({
  id: bloque.id,
  titulo: bloque.titulo,
  horaInicio: bloque.horaInicio,
  horaFin: bloque.horaFin,
  ...(bloque.ref ? { ref: bloque.ref } : {}),
})
