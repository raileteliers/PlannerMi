import { describe, expect, it } from 'vitest'
import {
  deleteCompromiso,
  deleteEvaluacion,
  deleteRamo,
  deleteTarea,
  planDeleteRamo,
} from './cascade'
import type { Dataset } from '../model/types'

/**
 * Two ramos. R1 has two evaluaciones (E1 with two tareas, E2 with one).
 * R2 has one evaluacion with no tareas. Blocks point at various things.
 */
const fixture = (): Dataset => ({
  ramos: [
    { id: 'R1', nombre: 'Cálculo', color: 'blue', archivado: false },
    { id: 'R2', nombre: 'Física', color: 'teal', archivado: false },
  ],
  evaluaciones: [
    {
      id: 'E1',
      ramoId: 'R1',
      titulo: 'Prueba 1',
      fecha: '2026-03-10',
      tipo: 'prueba',
      importancia: 'alta',
    },
    {
      id: 'E2',
      ramoId: 'R1',
      titulo: 'Entrega',
      fecha: '2026-03-20',
      tipo: 'entrega',
      importancia: 'media',
    },
    {
      id: 'E3',
      ramoId: 'R2',
      titulo: 'Control',
      fecha: '2026-03-12',
      tipo: 'control',
      importancia: 'baja',
    },
  ],
  compromisos: [
    {
      id: 'C1',
      titulo: 'Doctor',
      fecha: '2026-03-05',
      categoria: 'salud',
      importancia: 'media',
    },
  ],
  tareas: [
    { id: 'T1', titulo: 'Guía 1', evaluacionId: 'E1', hecha: false },
    { id: 'T2', titulo: 'Guía 2', evaluacionId: 'E1', hecha: true },
    { id: 'T3', titulo: 'Informe', evaluacionId: 'E2', hecha: false },
    { id: 'T4', titulo: 'Comprar cuaderno', hecha: false }, // loose task
  ],
  bloques: [
    {
      id: 'B1',
      fecha: '2026-03-09',
      horaInicio: '18:00',
      horaFin: '20:00',
      titulo: 'Estudiar Prueba 1',
      ref: { tipo: 'evaluacion', id: 'E1' },
    },
    {
      id: 'B2',
      fecha: '2026-03-08',
      horaInicio: '10:00',
      horaFin: '11:00',
      titulo: 'Guía 1',
      ref: { tipo: 'tarea', id: 'T1' },
    },
    {
      id: 'B3',
      fecha: '2026-03-05',
      horaInicio: '09:00',
      horaFin: '10:00',
      titulo: 'Doctor',
      ref: { tipo: 'compromiso', id: 'C1' },
    },
    {
      id: 'B4',
      fecha: '2026-03-11',
      horaInicio: '15:00',
      horaFin: '16:00',
      titulo: 'Control Física',
      ref: { tipo: 'evaluacion', id: 'E3' },
    },
    {
      id: 'B5',
      fecha: '2026-03-07',
      horaInicio: '08:00',
      horaFin: '09:00',
      titulo: 'Correr',
    },
  ],
})

describe('deleteRamo', () => {
  it('removes the ramo, its evaluaciones and their tareas', () => {
    const { dataset } = deleteRamo(fixture(), 'R1')
    expect(dataset.ramos.map((r) => r.id)).toEqual(['R2'])
    expect(dataset.evaluaciones.map((e) => e.id)).toEqual(['E3'])
    expect(dataset.tareas.map((t) => t.id)).toEqual(['T4'])
  })

  it('leaves the loose task alone', () => {
    const { dataset } = deleteRamo(fixture(), 'R1')
    expect(dataset.tareas.find((t) => t.id === 'T4')).toBeDefined()
  })

  it('keeps every block alive and only clears the refs that dangled', () => {
    const { dataset } = deleteRamo(fixture(), 'R1')
    expect(dataset.bloques).toHaveLength(5)

    const byId = Object.fromEntries(dataset.bloques.map((b) => [b.id, b]))
    expect(byId.B1?.ref).toBeUndefined()
    expect(byId.B1?.titulo).toBe('Estudiar Prueba 1')
    expect(byId.B2?.ref).toBeUndefined()
    expect(byId.B3?.ref).toEqual({ tipo: 'compromiso', id: 'C1' })
    expect(byId.B4?.ref).toEqual({ tipo: 'evaluacion', id: 'E3' })
    expect(byId.B5?.ref).toBeUndefined()
  })

  it('drops the ref key rather than storing an undefined value', () => {
    const { dataset } = deleteRamo(fixture(), 'R1')
    const b1 = dataset.bloques.find((b) => b.id === 'B1')!
    expect(Object.hasOwn(b1, 'ref')).toBe(false)
  })

  it('reports the counts the confirmation dialog needs', () => {
    const plan = planDeleteRamo(fixture(), 'R1')
    expect(plan.evaluacionIds).toHaveLength(2)
    expect(plan.tareaIds).toHaveLength(3)
    expect(plan.bloquesDesvinculados.map((b) => b.id)).toEqual(['B1', 'B2'])
  })

  it('does nothing for an unknown ramo', () => {
    const before = fixture()
    const { dataset } = deleteRamo(before, 'nope')
    expect(dataset).toEqual(before)
  })

  it('does not mutate the input dataset', () => {
    const before = fixture()
    deleteRamo(before, 'R1')
    expect(before.evaluaciones).toHaveLength(3)
    expect(before.bloques[0]?.ref).toEqual({ tipo: 'evaluacion', id: 'E1' })
  })
})

describe('deleteEvaluacion', () => {
  it('removes its tareas and unlinks blocks pointing at either', () => {
    const { dataset } = deleteEvaluacion(fixture(), 'E1')
    expect(dataset.evaluaciones.map((e) => e.id)).toEqual(['E2', 'E3'])
    expect(dataset.tareas.map((t) => t.id)).toEqual(['T3', 'T4'])
    expect(dataset.bloques).toHaveLength(5)
    expect(dataset.bloques.find((b) => b.id === 'B1')?.ref).toBeUndefined()
    expect(dataset.bloques.find((b) => b.id === 'B2')?.ref).toBeUndefined()
  })

  it('leaves the sibling evaluacion and its tarea untouched', () => {
    const { dataset } = deleteEvaluacion(fixture(), 'E1')
    expect(dataset.tareas.find((t) => t.id === 'T3')).toBeDefined()
  })
})

describe('deleteCompromiso', () => {
  it('takes nothing with it and unlinks its block', () => {
    const { dataset } = deleteCompromiso(fixture(), 'C1')
    expect(dataset.compromisos).toHaveLength(0)
    expect(dataset.tareas).toHaveLength(4)
    expect(dataset.bloques).toHaveLength(5)
    expect(dataset.bloques.find((b) => b.id === 'B3')?.ref).toBeUndefined()
  })
})

describe('deleteTarea', () => {
  it('removes only that tarea and unlinks its block', () => {
    const { dataset } = deleteTarea(fixture(), 'T1')
    expect(dataset.tareas.map((t) => t.id)).toEqual(['T2', 'T3', 'T4'])
    expect(dataset.bloques.find((b) => b.id === 'B2')?.ref).toBeUndefined()
    expect(dataset.bloques.find((b) => b.id === 'B1')?.ref).toBeDefined()
  })
})
