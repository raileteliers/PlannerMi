import { describe, expect, it } from 'vitest'
import { expandCompromiso, expandCompromisos } from './recurrence'
import type { Compromiso, Recurrencia } from '../model/types'

const base = (recurrencia?: Recurrencia): Compromiso => ({
  id: 'c1',
  titulo: 'Gimnasio',
  fecha: '2026-03-02', // a Monday
  categoria: 'deporte',
  importancia: 'media',
  recurrencia,
})

const marzo = { desde: '2026-03-01', hasta: '2026-03-31' }

describe('expandCompromiso', () => {
  it('returns the single date when there is no recurrence', () => {
    expect(expandCompromiso(base(), marzo)).toEqual(['2026-03-02'])
  })

  it('returns nothing when a one-off falls outside the range', () => {
    expect(expandCompromiso(base(), { desde: '2026-04-01', hasta: '2026-04-30' })).toEqual(
      [],
    )
  })

  it('expands weekly on the given weekdays', () => {
    // Monday, Wednesday, Friday
    const c = base({ frecuencia: 'semanal', intervalo: 1, diasSemana: [1, 3, 5], excepciones: [] })
    expect(expandCompromiso(c, marzo)).toEqual([
      '2026-03-02',
      '2026-03-04',
      '2026-03-06',
      '2026-03-09',
      '2026-03-11',
      '2026-03-13',
      '2026-03-16',
      '2026-03-18',
      '2026-03-20',
      '2026-03-23',
      '2026-03-25',
      '2026-03-27',
      '2026-03-30',
    ])
  })

  it('never returns an occurrence before the start date', () => {
    // Starts on a Wednesday but the series includes Mondays: the Monday of
    // that first week is before the start and must not appear.
    const c: Compromiso = {
      ...base({ frecuencia: 'semanal', intervalo: 1, diasSemana: [1, 3], excepciones: [] }),
      fecha: '2026-03-04',
    }
    expect(expandCompromiso(c, marzo)[0]).toBe('2026-03-04')
  })

  it('honours an interval greater than 1 (every two weeks)', () => {
    const c = base({ frecuencia: 'semanal', intervalo: 2, diasSemana: [1], excepciones: [] })
    expect(expandCompromiso(c, marzo)).toEqual(['2026-03-02', '2026-03-16', '2026-03-30'])
  })

  it('honours an interval greater than 1 on a daily series', () => {
    const c = base({ frecuencia: 'diaria', intervalo: 3, excepciones: [] })
    expect(expandCompromiso(c, { desde: '2026-03-01', hasta: '2026-03-12' })).toEqual([
      '2026-03-02',
      '2026-03-05',
      '2026-03-08',
      '2026-03-11',
    ])
  })

  it('keeps the interval phase when the range starts mid-series', () => {
    const c = base({ frecuencia: 'diaria', intervalo: 3, excepciones: [] })
    // Series is 02, 05, 08, 11, 14, 17... asking from the 12th must resume on 14.
    expect(expandCompromiso(c, { desde: '2026-03-12', hasta: '2026-03-20' })).toEqual([
      '2026-03-14',
      '2026-03-17',
      '2026-03-20',
    ])
  })

  it('keeps the interval phase on a biweekly series queried later', () => {
    const c = base({ frecuencia: 'semanal', intervalo: 2, diasSemana: [1], excepciones: [] })
    expect(expandCompromiso(c, { desde: '2026-04-01', hasta: '2026-04-30' })).toEqual([
      '2026-04-13',
      '2026-04-27',
    ])
  })

  it('subtracts an exception in the middle of a series', () => {
    const c = base({
      frecuencia: 'semanal',
      intervalo: 1,
      diasSemana: [1],
      excepciones: ['2026-03-16'],
    })
    expect(expandCompromiso(c, marzo)).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-23',
      '2026-03-30',
    ])
  })

  it('stops at the series end date, inclusive', () => {
    const c = base({
      frecuencia: 'semanal',
      intervalo: 1,
      diasSemana: [1],
      hasta: '2026-03-16',
      excepciones: [],
    })
    expect(expandCompromiso(c, marzo)).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
    ])
  })

  it('returns nothing once the series has ended before the range', () => {
    const c = base({
      frecuencia: 'semanal',
      intervalo: 1,
      diasSemana: [1],
      hasta: '2026-03-16',
      excepciones: [],
    })
    expect(expandCompromiso(c, { desde: '2026-04-01', hasta: '2026-04-30' })).toEqual([])
  })

  it('falls back to the start weekday when diasSemana is missing', () => {
    const c = base({ frecuencia: 'semanal', intervalo: 1, excepciones: [] })
    expect(expandCompromiso(c, { desde: '2026-03-01', hasta: '2026-03-16' })).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
    ])
  })

  it('repeats monthly on the same day of the month', () => {
    const c = base({ frecuencia: 'mensual', intervalo: 1, excepciones: [] })
    expect(expandCompromiso(c, { desde: '2026-03-01', hasta: '2026-06-30' })).toEqual([
      '2026-03-02',
      '2026-04-02',
      '2026-05-02',
      '2026-06-02',
    ])
  })

  it('skips months that do not have the day (31st in February)', () => {
    const c: Compromiso = {
      ...base({ frecuencia: 'mensual', intervalo: 1, excepciones: [] }),
      fecha: '2026-01-31',
    }
    expect(expandCompromiso(c, { desde: '2026-01-01', hasta: '2026-04-30' })).toEqual([
      '2026-01-31',
      '2026-03-31',
    ])
  })

  it('clips the series to the queried range', () => {
    const c = base({ frecuencia: 'diaria', intervalo: 1, excepciones: [] })
    expect(expandCompromiso(c, { desde: '2026-03-10', hasta: '2026-03-12' })).toEqual([
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
    ])
  })

  it('treats an interval of 0 as 1 instead of looping forever', () => {
    const c = base({ frecuencia: 'diaria', intervalo: 0, excepciones: [] })
    expect(expandCompromiso(c, { desde: '2026-03-02', hasta: '2026-03-04' })).toEqual([
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
    ])
  })
})

describe('expandCompromisos', () => {
  it('flattens several commitments into dated pairs', () => {
    const gym = base({ frecuencia: 'semanal', intervalo: 1, diasSemana: [1], excepciones: [] })
    const doctor: Compromiso = {
      id: 'c2',
      titulo: 'Doctor',
      fecha: '2026-03-05',
      hora: '10:00',
      categoria: 'salud',
      importancia: 'alta',
    }
    const pairs = expandCompromisos([gym, doctor], {
      desde: '2026-03-01',
      hasta: '2026-03-10',
    })
    expect(pairs).toEqual([
      { compromiso: gym, fecha: '2026-03-02' },
      { compromiso: gym, fecha: '2026-03-09' },
      { compromiso: doctor, fecha: '2026-03-05' },
    ])
  })
})
