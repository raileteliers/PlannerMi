import { describe, expect, it } from 'vitest'
import { avisosDe, MAX_AVISOS } from './notifications'
import { emptyDataset, type Dataset } from '../model/types'

// Sunday 1 March 2026, 08:00.
const ahora = new Date(2026, 2, 1, 8, 0)

const dataset = (parcial: Partial<Dataset>): Dataset => ({ ...emptyDataset(), ...parcial })

const ramo = {
  id: 'r1',
  nombre: 'Cálculo II',
  color: 'blue' as const,
  archivado: false,
}

const evaluacion = {
  id: 'e1',
  ramoId: 'r1',
  titulo: 'Interrogación 1',
  fecha: '2026-03-20',
  tipo: 'prueba' as const,
  importancia: 'alta' as const,
}

describe('avisosDe', () => {
  it('warns a week before an evaluación, at 9am', () => {
    const [aviso] = avisosDe(dataset({ ramos: [ramo], evaluaciones: [evaluacion] }), ahora)

    expect(aviso?.cuando).toEqual(new Date(2026, 2, 13, 9, 0))
    expect(aviso?.titulo).toBe('Prueba: Interrogación 1')
    expect(aviso?.cuerpo).toContain('Cálculo II')
  })

  it('warns an hour before a compromiso that has a time', () => {
    const data = dataset({
      compromisos: [
        {
          id: 'c1',
          titulo: 'Clase de Física',
          fecha: '2026-03-05',
          hora: '14:30',
          categoria: 'personal',
          importancia: 'media',
        },
      ],
    })

    expect(avisosDe(data, ahora)[0]?.cuando).toEqual(new Date(2026, 2, 5, 13, 30))
  })

  it('warns an hour before a bloque', () => {
    const data = dataset({
      bloques: [
        {
          id: 'b1',
          fecha: '2026-03-05',
          horaInicio: '16:00',
          horaFin: '18:00',
          titulo: 'Estudiar cálculo',
        },
      ],
    })

    expect(avisosDe(data, ahora)[0]?.cuando).toEqual(new Date(2026, 2, 5, 15, 0))
  })

  it('falls back to 9am for a compromiso with no time', () => {
    const data = dataset({
      compromisos: [
        {
          id: 'c1',
          titulo: 'Entregar formulario',
          fecha: '2026-03-05',
          categoria: 'tramite',
          importancia: 'media',
        },
      ],
    })

    expect(avisosDe(data, ahora)[0]?.cuando).toEqual(new Date(2026, 2, 5, 9, 0))
  })

  it('drops anything already past, including a reminder for a future date', () => {
    const data = dataset({
      ramos: [ramo],
      // 3 March is still ahead, but its week-before warning was 24 February.
      evaluaciones: [{ ...evaluacion, fecha: '2026-03-03' }],
    })

    expect(avisosDe(data, ahora)).toEqual([])
  })

  it('ignores evaluaciones of an archived ramo', () => {
    const data = dataset({
      ramos: [{ ...ramo, archivado: true }],
      evaluaciones: [evaluacion],
    })

    expect(avisosDe(data, ahora)).toEqual([])
  })

  it('gives every occurrence of a recurring compromiso its own id', () => {
    const data = dataset({
      compromisos: [
        {
          id: 'c1',
          titulo: 'Ayudantía',
          fecha: '2026-03-02',
          hora: '10:00',
          categoria: 'personal',
          importancia: 'media',
          recurrencia: { frecuencia: 'semanal', intervalo: 1, excepciones: [] },
        },
      ],
    })

    const avisos = avisosDe(data, ahora)
    expect(avisos.length).toBeGreaterThan(3)
    expect(new Set(avisos.map((a) => a.id)).size).toBe(avisos.length)
    expect(avisos[0]?.cuando).toEqual(new Date(2026, 2, 2, 9, 0))
  })

  it('returns them in chronological order and never more than Android allows', () => {
    const data = dataset({
      compromisos: [
        {
          id: 'c1',
          titulo: 'Diaria',
          fecha: '2026-03-02',
          hora: '10:00',
          categoria: 'personal',
          importancia: 'media',
          recurrencia: { frecuencia: 'diaria', intervalo: 1, excepciones: [] },
        },
      ],
    })

    const avisos = avisosDe(data, ahora)
    const tiempos = avisos.map((a) => a.cuando.getTime())

    expect(avisos.length).toBeLessThanOrEqual(MAX_AVISOS)
    expect(tiempos).toEqual([...tiempos].sort((a, b) => a - b))
  })

  it('is empty for an empty dataset', () => {
    expect(avisosDe(emptyDataset(), ahora)).toEqual([])
  })
})
