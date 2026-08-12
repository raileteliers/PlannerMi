import type { HoraHHMM } from './date'

/** Minutes since midnight. The only arithmetic unit for times in the app. */
export const toMinutos = (hora: HoraHHMM): number => {
  const [h = '0', m = '0'] = hora.split(':')
  return Number(h) * 60 + Number(m)
}

export const toHoraHHMM = (minutos: number): HoraHHMM => {
  const acotado = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutos)))
  const h = Math.floor(acotado / 60)
  const m = acotado % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const sumarMinutos = (hora: HoraHHMM, minutos: number): HoraHHMM =>
  toHoraHHMM(toMinutos(hora) + minutos)

/**
 * Typed, not picked — same reason as dates. Accepts "19", "19:30", "1930",
 * "9.30" and returns null for anything it cannot read.
 */
export function parseHoraCorta(input: string): HoraHHMM | null {
  const limpio = input.trim()
  if (limpio === '') return null

  const partes = limpio.split(/[:.\-h ]+/).filter((p) => p !== '')
  let horas: number
  let minutos = 0

  if (partes.length === 1) {
    const solo = partes[0] as string
    if (!/^\d{1,4}$/.test(solo)) return null
    if (solo.length <= 2) {
      horas = Number(solo)
    } else {
      // "1930" and "930"
      horas = Number(solo.slice(0, solo.length - 2))
      minutos = Number(solo.slice(-2))
    }
  } else if (partes.length === 2) {
    const [h, m] = partes as [string, string]
    if (!/^\d{1,2}$/.test(h) || !/^\d{1,2}$/.test(m)) return null
    horas = Number(h)
    minutos = m.length === 1 ? Number(m) * 10 : Number(m)
  } else {
    return null
  }

  if (horas > 23 || minutos > 59) return null
  return toHoraHHMM(horas * 60 + minutos)
}

/** '1 h 30 min' — for the block sheet's summary line. */
export function formatDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}
