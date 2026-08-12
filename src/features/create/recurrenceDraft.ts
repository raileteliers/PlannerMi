import type { Recurrencia } from '../../model/types'

/** A new series defaults to weekly on the day it starts. */
export const recurrenciaNueva = (diaSemana: number): Recurrencia => ({
  frecuencia: 'semanal',
  intervalo: 1,
  diasSemana: [diaSemana],
  excepciones: [],
})
