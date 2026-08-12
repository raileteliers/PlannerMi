import { describe, expect, it } from 'vitest'
import {
  alturaBarraPx,
  datedItemsEnRango,
  itemsPorFecha,
  separacionBarrasPx,
  tareasDelDia,
  tieneImportanciaAlta,
} from './monthItems'
import type { Dataset } from '../model/types'

const marzo = { desde: '2026-03-01', hasta: '2026-03-31' }

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
      fecha: '2026-03-10',
      tipo: 'prueba',
      importancia: 'alta',
    },
    {
      id: 'E2',
      ramoId: 'R1',
      titulo: 'Entrega',
      fecha: '2026-04-02', // outside the range
      tipo: 'entrega',
      importancia: 'media',
    },
    {
      id: 'E3',
      ramoId: 'R2', // archived ramo
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
      fecha: '2026-03-02',
      categoria: 'deporte',
      importancia: 'baja',
      recurrencia: { frecuencia: 'semanal', intervalo: 1, diasSemana: [1], excepciones: [] },
    },
    {
      id: 'C2',
      titulo: 'Doctor',
      fecha: '2026-03-10',
      hora: '11:00',
      categoria: 'salud',
      importancia: 'media',
    },
  ],
  tareas: [
    { id: 'T1', titulo: 'Guía 2', fecha: '2026-03-10', hecha: false },
    { id: 'T2', titulo: 'Guía 1', fecha: '2026-03-10', hecha: true },
    { id: 'T3', titulo: 'Sin fecha', hecha: false },
  ],
  bloques: [],
})

describe('datedItemsEnRango', () => {
  it('normalizes an evaluacion with its ramo color', () => {
    const item = datedItemsEnRango(fixture(), marzo).find((i) => i.id === 'E1')
    expect(item).toEqual({
      id: 'E1',
      fecha: '2026-03-10',
      titulo: 'Prueba 1',
      color: 'blue',
      importancia: 'alta',
      esRecurrente: false,
      origen: 'evaluacion',
    })
  })

  it('leaves out evaluaciones of archived ramos', () => {
    const items = datedItemsEnRango(fixture(), marzo)
    expect(items.some((i) => i.titulo === 'Examen viejo')).toBe(false)
  })

  it('leaves out evaluaciones outside the range', () => {
    const items = datedItemsEnRango(fixture(), marzo)
    expect(items.some((i) => i.id === 'E2')).toBe(false)
  })

  it('colors commitments by category, not by ramo', () => {
    const doctor = datedItemsEnRango(fixture(), marzo).find((i) => i.titulo === 'Doctor')
    expect(doctor?.color).toBe('green') // salud
    expect(doctor?.esRecurrente).toBe(false)
  })

  it('expands a recurring commitment into one item per occurrence', () => {
    const gym = datedItemsEnRango(fixture(), marzo).filter((i) => i.titulo === 'Gimnasio')
    expect(gym).toHaveLength(5) // every Monday in March 2026
    expect(gym.every((i) => i.esRecurrente)).toBe(true)
    expect(new Set(gym.map((i) => i.id)).size).toBe(5) // ids are unique per day
  })

  it('never hands the grid an entity type', () => {
    const claves = Object.keys(datedItemsEnRango(fixture(), marzo)[0] ?? {}).sort()
    expect(claves).toEqual([
      'color',
      'esRecurrente',
      'fecha',
      'id',
      'importancia',
      'origen',
      'titulo',
    ])
  })
})

describe('itemsPorFecha', () => {
  it('groups by day', () => {
    const porFecha = itemsPorFecha(fixture(), marzo)
    expect(porFecha.get('2026-03-10')).toHaveLength(2) // prueba + doctor
    expect(porFecha.get('2026-03-31')).toBeUndefined()
  })

  it('stacks the exceptional above the routine', () => {
    const data = fixture()
    // 9 March is a Monday: gym (recurring) lands with a one-off and an evaluacion.
    data.compromisos.push({
      id: 'C3',
      titulo: 'Trámite',
      fecha: '2026-03-09',
      categoria: 'tramite',
      importancia: 'media',
    })
    data.evaluaciones.push({
      id: 'E4',
      ramoId: 'R1',
      titulo: 'Control',
      fecha: '2026-03-09',
      tipo: 'control',
      importancia: 'baja',
    })

    const dia = itemsPorFecha(data, marzo).get('2026-03-09') ?? []
    expect(dia.map((i) => i.titulo)).toEqual(['Control', 'Trámite', 'Gimnasio'])
  })
})

describe('tieneImportanciaAlta', () => {
  it('is true when any item that day is high importance', () => {
    const porFecha = itemsPorFecha(fixture(), marzo)
    expect(tieneImportanciaAlta(porFecha.get('2026-03-10') ?? [])).toBe(true)
    expect(tieneImportanciaAlta(porFecha.get('2026-03-02') ?? [])).toBe(false)
  })
})

describe('alturaBarraPx', () => {
  it('gives a high-importance bar more weight than the rest', () => {
    expect(alturaBarraPx('alta', 1)).toBeGreaterThan(alturaBarraPx('media', 1))
    expect(alturaBarraPx('media', 1)).toBeGreaterThan(alturaBarraPx('baja', 1))
  })

  it('keeps the ranking on a crowded day', () => {
    expect(alturaBarraPx('alta', 4)).toBeGreaterThan(alturaBarraPx('baja', 4))
  })

  it('thins everything down as the day fills up', () => {
    expect(alturaBarraPx('alta', 4)).toBeLessThan(alturaBarraPx('alta', 1))
    expect(alturaBarraPx('alta', 2)).toBe(alturaBarraPx('alta', 1)) // two is not crowded
  })

  it('never draws something too thin to be a bar or thick enough to be a chart', () => {
    const importancias = ['alta', 'media', 'baja'] as const
    for (const importancia of importancias) {
      for (let n = 0; n <= 8; n++) {
        const alto = alturaBarraPx(importancia, n)
        expect(alto).toBeGreaterThanOrEqual(2)
        expect(alto).toBeLessThanOrEqual(6)
        expect(Number.isInteger(alto)).toBe(true)
      }
    }
  })

  it('treats counts beyond the cap like a full day', () => {
    expect(alturaBarraPx('media', 9)).toBe(alturaBarraPx('media', 4))
  })

  it('fits four bars and their gaps in a cell', () => {
    const alto = 4 * alturaBarraPx('alta', 4) + 3 * separacionBarrasPx(4)
    expect(alto).toBeLessThan(40) // the cell has ~60px under the day number
  })
})

describe('separacionBarrasPx', () => {
  it('tightens with the same crowding', () => {
    expect(separacionBarrasPx(4)).toBeLessThan(separacionBarrasPx(1))
  })
})

describe('tareasDelDia', () => {
  it('returns the tasks dated that day, pending first', () => {
    expect(tareasDelDia(fixture(), '2026-03-10').map((t) => t.titulo)).toEqual([
      'Guía 2',
      'Guía 1',
    ])
  })

  it('ignores undated tasks', () => {
    expect(tareasDelDia(fixture(), '2026-03-11')).toEqual([])
  })
})
