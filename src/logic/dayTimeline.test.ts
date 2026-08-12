import { describe, expect, it } from 'vitest'
import {
  DURACION_BLOQUE_DEFECTO_MIN,
  entradasDelTimeline,
  franjaSuperior,
  franjaVacia,
  slotSugerido,
  ubicarEntradas,
  type EntradaTimeline,
} from './dayTimeline'
import { parseHoraCorta, formatDuracion, sumarMinutos, toHoraHHMM, toMinutos } from '../lib/time'
import type { Dataset } from '../model/types'

const DIA = '2026-03-12' // a Thursday

const fixture = (): Dataset => ({
  ramos: [
    { id: 'R1', nombre: 'Cálculo', color: 'blue', archivado: false },
    { id: 'R2', nombre: 'Viejo', color: 'teal', archivado: true },
  ],
  evaluaciones: [
    {
      id: 'E1',
      ramoId: 'R1',
      titulo: 'Entrega',
      fecha: DIA,
      tipo: 'entrega',
      importancia: 'alta',
    },
    {
      id: 'E2',
      ramoId: 'R2',
      titulo: 'De ramo archivado',
      fecha: DIA,
      tipo: 'prueba',
      importancia: 'alta',
    },
  ],
  compromisos: [
    {
      id: 'C1',
      titulo: 'Doctor',
      fecha: DIA,
      hora: '11:00',
      duracionMin: 30,
      categoria: 'salud',
      importancia: 'media',
    },
    {
      id: 'C2',
      titulo: 'Gimnasio',
      fecha: '2026-03-02',
      hora: '19:00',
      duracionMin: 60,
      categoria: 'deporte',
      importancia: 'baja',
      recurrencia: { frecuencia: 'semanal', intervalo: 1, diasSemana: [4], excepciones: [] },
    },
    {
      id: 'C3',
      titulo: 'Llamar al banco', // no hour: belongs in the top strip
      fecha: DIA,
      categoria: 'tramite',
      importancia: 'media',
    },
  ],
  tareas: [
    { id: 'T1', titulo: 'Terminar informe', fecha: DIA, evaluacionId: 'E1', hecha: false },
    { id: 'T2', titulo: 'Sin fecha', hecha: false },
  ],
  bloques: [
    {
      id: 'B1',
      fecha: DIA,
      horaInicio: '18:00',
      horaFin: '20:00',
      titulo: 'Estudiar',
      ref: { tipo: 'evaluacion', id: 'E1' },
    },
    {
      id: 'B2',
      fecha: '2026-03-13',
      horaInicio: '09:00',
      horaFin: '10:00',
      titulo: 'Otro día',
    },
  ],
})

describe('entradasDelTimeline', () => {
  it('includes blocks and commitments with an hour, in time order', () => {
    const entradas = entradasDelTimeline(fixture(), DIA)
    expect(entradas.map((e) => e.titulo)).toEqual(['Doctor', 'Estudiar', 'Gimnasio'])
  })

  it('leaves out blocks from other days', () => {
    expect(entradasDelTimeline(fixture(), DIA).some((e) => e.titulo === 'Otro día')).toBe(false)
  })

  it('leaves out commitments without an hour', () => {
    expect(
      entradasDelTimeline(fixture(), DIA).some((e) => e.titulo === 'Llamar al banco'),
    ).toBe(false)
  })

  it('gives a block the color of what it points at', () => {
    const bloque = entradasDelTimeline(fixture(), DIA).find((e) => e.id === 'B1')
    expect(bloque?.color).toBe('blue') // Cálculo
    expect(bloque?.tipo).toBe('bloque')
  })

  it('leaves a loose block without a color', () => {
    const data = fixture()
    data.bloques[0] = { ...data.bloques[0]!, ref: undefined }
    expect(entradasDelTimeline(data, DIA).find((e) => e.id === 'B1')?.color).toBeUndefined()
  })

  it('marks a recurring commitment as such', () => {
    const gym = entradasDelTimeline(fixture(), DIA).find((e) => e.titulo === 'Gimnasio')
    expect(gym?.esRecurrente).toBe(true)
    expect(gym?.finMin).toBe(20 * 60) // 19:00 + 60 min
  })

  it('defaults a commitment with no duration to one slot', () => {
    const data = fixture()
    data.compromisos[0] = { ...data.compromisos[0]!, duracionMin: undefined }
    const doctor = entradasDelTimeline(data, DIA).find((e) => e.titulo === 'Doctor')
    expect(doctor!.finMin - doctor!.inicioMin).toBe(30)
  })
})

describe('ubicarEntradas', () => {
  const entrada = (id: string, inicioMin: number, finMin: number): EntradaTimeline => ({
    id,
    titulo: id,
    inicioMin,
    finMin,
    tipo: 'bloque',
    esRecurrente: false,
  })

  it('gives a lone entry the whole width', () => {
    const [solo] = ubicarEntradas([entrada('A', 600, 660)])
    expect(solo).toMatchObject({ columna: 0, columnas: 1 })
  })

  it('splits two overlapping entries into two columns', () => {
    const ubicadas = ubicarEntradas([entrada('A', 600, 720), entrada('B', 660, 780)])
    expect(ubicadas.map((u) => u.columna)).toEqual([0, 1])
    expect(ubicadas.every((u) => u.columnas === 2)).toBe(true)
  })

  it('keeps consecutive entries full width', () => {
    const ubicadas = ubicarEntradas([entrada('A', 600, 660), entrada('B', 660, 720)])
    expect(ubicadas.every((u) => u.columnas === 1)).toBe(true)
  })

  it('reuses a column once it is free again', () => {
    const ubicadas = ubicarEntradas([
      entrada('A', 600, 780), // 10:00-13:00
      entrada('B', 660, 690), // 11:00-11:30
      entrada('C', 700, 730), // 11:40-12:10, B is done
    ])
    expect(ubicadas.map((u) => [u.entrada.id, u.columna, u.columnas])).toEqual([
      ['A', 0, 2],
      ['B', 1, 2],
      ['C', 1, 2],
    ])
  })

  it('treats a transitive chain as one group', () => {
    const ubicadas = ubicarEntradas([
      entrada('A', 600, 660),
      entrada('B', 630, 700),
      entrada('C', 680, 740), // overlaps B but not A
    ])
    expect(ubicadas.every((u) => u.columnas === 2)).toBe(true)
  })
})

describe('slotSugerido', () => {
  it('suggests 18:00 when the evening is free', () => {
    expect(slotSugerido([])).toBe(18 * 60)
  })

  it('moves past a block that already sits there', () => {
    const entradas = entradasDelTimeline(fixture(), DIA) // Estudiar 18:00-20:00
    expect(slotSugerido(entradas)).toBe(20 * 60)
  })

  it('falls back to the morning when the evening is full', () => {
    const lleno: EntradaTimeline[] = [
      {
        id: 'x',
        titulo: 'todo',
        inicioMin: 18 * 60,
        finMin: 23 * 60,
        tipo: 'bloque',
        esRecurrente: false,
      },
    ]
    expect(slotSugerido(lleno)).toBe(7 * 60)
  })

  it('leaves room for a default-length block', () => {
    expect(DURACION_BLOQUE_DEFECTO_MIN).toBe(60)
  })
})

describe('franjaSuperior', () => {
  it('carries the day evaluaciones, its tareas and hourless commitments', () => {
    const franja = franjaSuperior(fixture(), DIA)
    expect(franja.evaluaciones.map((e) => e.titulo)).toEqual(['Entrega'])
    expect(franja.tareas.map((t) => t.titulo)).toEqual(['Terminar informe'])
    expect(franja.compromisosSinHora.map((c) => c.titulo)).toEqual(['Llamar al banco'])
  })

  it('leaves out evaluaciones of archived ramos', () => {
    expect(
      franjaSuperior(fixture(), DIA).evaluaciones.some((e) => e.id === 'E2'),
    ).toBe(false)
  })

  it('leaves out undated tasks', () => {
    expect(franjaSuperior(fixture(), DIA).tareas.some((t) => t.id === 'T2')).toBe(false)
  })

  it('collapses on a day with nothing', () => {
    expect(franjaVacia(franjaSuperior(fixture(), '2026-03-15'))).toBe(true)
    expect(franjaVacia(franjaSuperior(fixture(), DIA))).toBe(false)
  })
})

describe('time helpers', () => {
  it('converts both ways', () => {
    expect(toMinutos('19:30')).toBe(19 * 60 + 30)
    expect(toHoraHHMM(19 * 60 + 30)).toBe('19:30')
    expect(sumarMinutos('23:30', 60)).toBe('23:59') // clamped inside the day
  })

  it('parses the shapes a person types', () => {
    expect(parseHoraCorta('19')).toBe('19:00')
    expect(parseHoraCorta('19:30')).toBe('19:30')
    expect(parseHoraCorta('1930')).toBe('19:30')
    expect(parseHoraCorta('930')).toBe('09:30')
    expect(parseHoraCorta('9.30')).toBe('09:30')
    expect(parseHoraCorta('9:5')).toBe('09:50')
    expect(parseHoraCorta(' 7 ')).toBe('07:00')
  })

  it('refuses what is not a time', () => {
    expect(parseHoraCorta('')).toBeNull()
    expect(parseHoraCorta('24:00')).toBeNull()
    expect(parseHoraCorta('19:70')).toBeNull()
    expect(parseHoraCorta('tarde')).toBeNull()
    expect(parseHoraCorta('19:30:15')).toBeNull()
  })

  it('formats a duration the way the sheet shows it', () => {
    expect(formatDuracion(30)).toBe('30 min')
    expect(formatDuracion(60)).toBe('1 h')
    expect(formatDuracion(90)).toBe('1 h 30 min')
  })
})
