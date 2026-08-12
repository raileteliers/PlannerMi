import type { Importancia, TipoEvaluacion } from '../model/types'
import type { Recurrencia } from '../model/types'

/** Interface copy lives here so the same word is never spelled two ways. */

export const TIPO_LABEL: Record<TipoEvaluacion, string> = {
  prueba: 'Prueba',
  control: 'Control',
  entrega: 'Entrega',
  examen: 'Examen',
}

export const IMPORTANCIA_LABEL: Record<Importancia, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

export const FRECUENCIA_LABEL: Record<Recurrencia['frecuencia'], string> = {
  diaria: 'Días',
  semanal: 'Semanas',
  mensual: 'Meses',
}

/** Sunday first, matching Recurrencia.diasSemana. */
export const DIA_SEMANA_LABEL = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
