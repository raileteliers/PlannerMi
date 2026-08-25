import { describe, expect, it } from 'vitest'
import { datasetToRows, rowsToDataset, type RecordRow } from './records'
import { emptyDataset, type Dataset } from '../model/types'

describe('datasetToRows', () => {
  it('flattens the five collections, tagging each row with its kind', () => {
    const rows = datasetToRows(sample())
    expect(rows).toHaveLength(4)
    expect(rows.map((r) => `${r.kind}:${r.id}`)).toEqual([
      'ramos:r1',
      'evaluaciones:e1',
      'tareas:t1',
      'bloques:b1',
    ])
  })

  it('sends the entity untouched, so an export stays interchangeable', () => {
    const [ramo] = datasetToRows(sample())
    expect(ramo?.data).toEqual(sample().ramos[0])
    expect(ramo?.data).not.toHaveProperty('user_id')
  })

  it('has nothing to send for an empty dataset', () => {
    expect(datasetToRows(emptyDataset())).toEqual([])
  })
})

describe('rowsToDataset', () => {
  it('is the inverse of datasetToRows', () => {
    expect(rowsToDataset(datasetToRows(sample()))).toEqual(sample())
  })

  it('does not care what order the rows came back in', () => {
    const revueltas = [...datasetToRows(sample())].reverse()
    const data = rowsToDataset(revueltas)
    expect(data.ramos).toHaveLength(1)
    expect(data.evaluaciones).toHaveLength(1)
    expect(data.bloques).toHaveLength(1)
  })

  it('drops a kind it does not know instead of refusing to open', () => {
    const rows = [
      ...datasetToRows(sample()),
      { kind: 'semestres', id: 's1', data: {} } as unknown as RecordRow,
    ]
    expect(rowsToDataset(rows)).toEqual(sample())
  })

  it('turns no rows into the empty dataset', () => {
    expect(rowsToDataset([])).toEqual(emptyDataset())
  })
})

const sample = (): Dataset => ({
  ramos: [{ id: 'r1', nombre: 'Cálculo', color: 'blue', archivado: false }],
  evaluaciones: [
    {
      id: 'e1', ramoId: 'r1', titulo: 'Prueba 1', fecha: '2026-08-24',
      tipo: 'prueba', importancia: 'alta',
    },
  ],
  compromisos: [],
  tareas: [{ id: 't1', titulo: 'Repasar', evaluacionId: 'e1', hecha: false }],
  bloques: [
    {
      id: 'b1', fecha: '2026-08-23', horaInicio: '10:00', horaFin: '11:30',
      titulo: 'Estudiar',
    },
  ],
})
