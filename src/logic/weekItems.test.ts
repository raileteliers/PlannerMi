import { describe, expect, it } from 'vitest'
import {
  diaVacio,
  tareasSinFecha,
  entradasDeSemana,
  rangoSemanaLabel,
  resumenDelDia,
  semanaDe,
  semanaVacia,
  semanaVecina,
  tareasPendientes,
} from './weekItems'
import type { Dataset } from '../model/types'

// 2026-03-11 is a Wednesday; its week runs Mon 09 to Sun 15.
const MIERCOLES = '2026-03-11'

const fixture = (): Dataset => ({
  ramos: [
    { id: 'R1', nombre: 'Cálculo', color: 'blue', archivado: false },
    { id: 'R2', nombre: 'Semestre pasado', color: 'teal', archivado: true },
  ],
  evaluaciones: [
    {
      id: 'E1',
      ramoId: 'R1',
      titulo: 'Prueba 1',
      fecha: '2026-03-11',
      tipo: 'prueba',
      importancia: 'alta',
    },
    {
      id: 'E2',
      ramoId: 'R2', // archived ramo: never shown
      titulo: 'Examen viejo',
      fecha: '2026-03-12',
      tipo: 'examen',
      importancia: 'alta',
    },
  ],
  compromisos: [
    {
      id: 'C1',
      titulo: 'Gimnasio',
      fecha: '2026-03-11',
      hora: '08:00',
      categoria: 'personal',
      importancia: 'baja',
    },
    {
      id: 'C2',
      titulo: 'Sin hora',
      fecha: '2026-03-11',
      categoria: 'personal',
      importancia: 'media',
    },
    {
      id: 'C3',
      titulo: 'Fuera de la semana',
      fecha: '2026-03-20',
      categoria: 'personal',
      importancia: 'media',
    },
  ],
  tareas: [
    { id: 'T1', titulo: 'Guía 4', fecha: '2026-03-11', hecha: false },
    { id: 'T2', titulo: 'Leer', fecha: '2026-03-11', hecha: true },
    { id: 'T3', titulo: 'Informe', fecha: '2026-03-13', hecha: false },
    { id: 'T4', titulo: 'Sin fecha', hecha: false },
    { id: 'T5', titulo: 'Anotarse al taller', hecha: false },
    { id: 'T6', titulo: 'Algo ya hecho', hecha: true },
  ],
  bloques: [],
})

describe('semanaDe', () => {
  it('starts on Monday and holds seven days', () => {
    expect(semanaDe(MIERCOLES)).toEqual([
      '2026-03-09',
      '2026-03-10',
      '2026-03-11',
      '2026-03-12',
      '2026-03-13',
      '2026-03-14',
      '2026-03-15',
    ])
  })

  it('keeps Sunday in the week that just ended, not the one starting', () => {
    expect(semanaDe('2026-03-15')[0]).toBe('2026-03-09')
  })
})

describe('semanaVecina', () => {
  it('lands on the Monday of the next and previous week', () => {
    expect(semanaVecina(MIERCOLES, 1)).toBe('2026-03-16')
    expect(semanaVecina(MIERCOLES, -1)).toBe('2026-03-02')
  })

  it('crosses a month boundary', () => {
    expect(semanaVecina('2026-03-30', 1)).toBe('2026-04-06')
  })
})

describe('entradasDeSemana', () => {
  const dias = entradasDeSemana(fixture(), semanaDe(MIERCOLES))

  it('returns one entry per day, even the empty ones', () => {
    expect(dias).toHaveLength(7)
    expect(dias.map((d) => d.fecha)).toEqual(semanaDe(MIERCOLES))
  })

  it('orders a day by hour, and sinks what has no hour', () => {
    const miercoles = dias[2]
    expect(miercoles?.items.map((i) => i.titulo)).toEqual([
      'Gimnasio', // 08:00
      'Prueba 1', // evaluación, no hour
      'Sin hora',
    ])
  })

  it('leaves out evaluaciones of archived ramos', () => {
    expect(dias[3]?.items).toEqual([])
  })

  it('leaves out what falls outside the week', () => {
    expect(dias.flatMap((d) => d.items).map((i) => i.titulo)).not.toContain(
      'Fuera de la semana',
    )
  })

  it('carries the tasks of each day, pending first', () => {
    expect(dias[2]?.tareas.map((t) => t.titulo)).toEqual(['Guía 4', 'Leer'])
    expect(dias[4]?.tareas.map((t) => t.titulo)).toEqual(['Informe'])
  })

  it('leaves undated tasks out: they belong to no day', () => {
    expect(dias.flatMap((d) => d.tareas).map((t) => t.titulo)).not.toContain('Sin fecha')
  })

  it('handles an empty range', () => {
    expect(entradasDeSemana(fixture(), [])).toEqual([])
  })
})

describe('vacío y conteos', () => {
  const dias = entradasDeSemana(fixture(), semanaDe(MIERCOLES))

  it('marks a day with neither items nor tasks as empty', () => {
    expect(diaVacio(dias[0] as never)).toBe(true)
    expect(diaVacio(dias[2] as never)).toBe(false)
  })

  it('counts only pending tasks', () => {
    expect(tareasPendientes(dias)).toBe(2) // Guía 4 and Informe; Leer is done
  })

  it('sees a week with nothing in it', () => {
    expect(semanaVacia(entradasDeSemana(fixture(), semanaDe('2026-06-10')))).toBe(true)
    expect(semanaVacia(dias)).toBe(false)
  })
})

describe('rangoSemanaLabel', () => {
  it('writes the month once when the week stays inside it', () => {
    expect(rangoSemanaLabel(semanaDe(MIERCOLES))).toBe('9 – 15 de marzo')
  })

  it('writes both months when the week straddles two', () => {
    expect(rangoSemanaLabel(semanaDe('2026-03-31'))).toBe('30 de mar – 5 de abr')
  })

  it('writes both years when the week straddles two', () => {
    expect(rangoSemanaLabel(semanaDe('2026-12-31'))).toBe(
      '28 de dic 2026 – 3 de ene 2027',
    )
  })

  it('handles an empty range', () => {
    expect(rangoSemanaLabel([])).toBe('')
  })
})

describe('tareasSinFecha', () => {
  it('takes only the ones with no date', () => {
    expect(tareasSinFecha(fixture()).map((t) => t.titulo)).toEqual([
      'Anotarse al taller',
      'Sin fecha',
      'Algo ya hecho',
    ])
  })

  it('sinks the done ones, so a fold of two hides them on its own', () => {
    expect(tareasSinFecha(fixture()).at(-1)?.titulo).toBe('Algo ya hecho')
  })

  it('is empty when every task has a date', () => {
    const data = fixture()
    data.tareas = data.tareas.filter((t) => t.fecha !== undefined)
    expect(tareasSinFecha(data)).toEqual([])
  })
})

describe('resumenDelDia', () => {
  const dia = (items: string[], tareas: { hecha: boolean }[] = []) => ({
    fecha: '2026-03-11',
    items: items.map((titulo, i) => ({
      id: String(i),
      fecha: '2026-03-11',
      titulo,
      color: 'blue' as const,
      importancia: 'media' as const,
      esRecurrente: false,
      origen: 'compromiso' as const,
    })),
    tareas: tareas.map((t, i) => ({ id: `t${i}`, titulo: `T${i}`, hecha: t.hecha })),
  })

  it('names what is scheduled and counts what is pending', () => {
    expect(resumenDelDia(dia(['Gimnasio', 'Control 2'], [{ hecha: false }, { hecha: false }]))).toBe(
      'Gimnasio · Control 2 · 2 tareas',
    )
  })

  it('says one tarea in the singular', () => {
    expect(resumenDelDia(dia([], [{ hecha: false }]))).toBe('1 tarea')
  })

  it('leaves done tasks out of the count', () => {
    expect(resumenDelDia(dia(['Gimnasio'], [{ hecha: true }, { hecha: false }]))).toBe(
      'Gimnasio · 1 tarea',
    )
  })

  it('distinguishes a finished day from an empty one', () => {
    expect(resumenDelDia(dia([], [{ hecha: true }]))).toBe('todo hecho')
    expect(resumenDelDia(dia([]))).toBe('')
  })
})
