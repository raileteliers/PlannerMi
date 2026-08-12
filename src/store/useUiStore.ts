import { create } from 'zustand'
import { todayISO, type ISODate } from '../lib/date'

interface UiState {
  /**
   * The date the global "+" prefills. Each screen sets it: the day you
   * tapped in the month, the day you are organizing, today everywhere else.
   */
  fechaContexto: ISODate
  setFechaContexto: (fecha: ISODate) => void
}

export const useUiStore = create<UiState>()((set) => ({
  fechaContexto: todayISO(),
  setFechaContexto: (fechaContexto) => set({ fechaContexto }),
}))
