import { describe, expect, it } from 'vitest'
import { buildExport, validateImport, validateImportText } from './importExport'
import type { Dataset } from '../model/types'

const dataset = (): Dataset => ({
  ramos: [{ id: 'R1', nombre: 'Cálculo', sigla: 'MAT1', color: 'blue', archivado: false }],
  evaluaciones: [
    {
      id: 'E1',
      ramoId: 'R1',
      titulo: 'Prueba 1',
      fecha: '2026-03-10',
      tipo: 'prueba',
      importancia: 'alta',
    },
  ],
  compromisos: [
    {
      id: 'C1',
      titulo: 'Gimnasio',
      fecha: '2026-03-02',
      hora: '19:00',
      duracionMin: 60,
      categoria: 'deporte',
      importancia: 'baja',
      recurrencia: {
        frecuencia: 'semanal',
        intervalo: 1,
        diasSemana: [1, 3, 5],
        hasta: '2026-07-31',
        excepciones: ['2026-03-16'],
      },
    },
  ],
  tareas: [{ id: 'T1', titulo: 'Guía 1', evaluacionId: 'E1', hecha: false }],
  bloques: [
    {
      id: 'B1',
      fecha: '2026-03-09',
      horaInicio: '18:00',
      horaFin: '20:00',
      titulo: 'Estudiar',
      ref: { tipo: 'evaluacion', id: 'E1' },
    },
  ],
})

/** Round-trip through JSON, the way a real file would travel. */
const roundTrip = (d: Dataset) => JSON.parse(JSON.stringify(buildExport(d)))

describe('validateImport — happy path', () => {
  it('accepts a file this app produced and returns it unchanged', () => {
    const result = validateImport(roundTrip(dataset()))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.datos).toEqual(dataset())
    expect(result.avisos).toEqual([])
  })

  it('accepts an empty but well-formed backup', () => {
    const result = validateImport(
      roundTrip({ ramos: [], evaluaciones: [], compromisos: [], tareas: [], bloques: [] }),
    )
    expect(result.ok).toBe(true)
  })

  it('accepts a loose task with no evaluacion and no date', () => {
    const d = dataset()
    d.tareas.push({ id: 'T2', titulo: 'Comprar cuaderno', hecha: false })
    expect(validateImport(roundTrip(d)).ok).toBe(true)
  })
})

describe('validateImport — rejected files', () => {
  const reject = (raw: unknown) => {
    const result = validateImport(raw)
    expect(result.ok).toBe(false)
    return result.ok ? [] : result.errores
  }

  it('rejects something that is not an object', () => {
    expect(reject('hola')[0]).toMatch(/objeto JSON/)
    expect(reject([1, 2, 3])[0]).toMatch(/objeto JSON/)
  })

  it('rejects a JSON file from another app', () => {
    expect(reject({ app: 'otracosa', version: 1, datos: {} })[0]).toMatch(/respaldo de PlannerMi/)
  })

  it('rejects a future schema version', () => {
    const file = { ...roundTrip(dataset()), version: 2 }
    expect(reject(file)[0]).toMatch(/versión 2/)
  })

  it('rejects a malformed date', () => {
    const file = roundTrip(dataset())
    file.datos.evaluaciones[0].fecha = '10-03-2026'
    expect(reject(file)[0]).toMatch(/AAAA-MM-DD/)
  })

  it('rejects a date that looks right but does not exist', () => {
    const file = roundTrip(dataset())
    file.datos.evaluaciones[0].fecha = '2026-02-30'
    expect(reject(file)[0]).toMatch(/AAAA-MM-DD/)
  })

  it('rejects an unknown course color', () => {
    const file = roundTrip(dataset())
    file.datos.ramos[0].color = 'rojo'
    expect(reject(file)[0]).toMatch(/color debe ser uno de/)
  })

  it('rejects an unknown importancia', () => {
    const file = roundTrip(dataset())
    file.datos.evaluaciones[0].importancia = 'urgentísima'
    expect(reject(file)[0]).toMatch(/importancia/)
  })

  it('rejects a missing required field', () => {
    const file = roundTrip(dataset())
    delete file.datos.ramos[0].nombre
    expect(reject(file)[0]).toMatch(/nombre debe ser un texto/)
  })

  it('rejects a block whose end time is not after its start', () => {
    const file = roundTrip(dataset())
    file.datos.bloques[0].horaFin = '18:00'
    expect(reject(file)[0]).toMatch(/posterior a la de inicio/)
  })

  it('rejects a bad time format', () => {
    const file = roundTrip(dataset())
    file.datos.bloques[0].horaInicio = '25:00'
    expect(reject(file)[0]).toMatch(/HH:MM/)
  })

  it('rejects duplicated ids', () => {
    const file = roundTrip(dataset())
    file.datos.ramos.push({ ...file.datos.ramos[0] })
    expect(reject(file)[0]).toMatch(/dos ramos con el id/)
  })

  it('rejects an evaluacion pointing at a missing ramo', () => {
    const file = roundTrip(dataset())
    file.datos.evaluaciones[0].ramoId = 'fantasma'
    expect(reject(file)[0]).toMatch(/apunta a un ramo/)
  })

  it('rejects a tarea pointing at a missing evaluacion', () => {
    const file = roundTrip(dataset())
    file.datos.tareas[0].evaluacionId = 'fantasma'
    expect(reject(file)[0]).toMatch(/apunta a una evaluación/)
  })

  it('rejects an interval below 1', () => {
    const file = roundTrip(dataset())
    file.datos.compromisos[0].recurrencia.intervalo = 0
    expect(reject(file)[0]).toMatch(/intervalo debe ser 1 o más/)
  })

  it('rejects a weekday outside 0-6', () => {
    const file = roundTrip(dataset())
    file.datos.compromisos[0].recurrencia.diasSemana = [1, 9]
    expect(reject(file)[0]).toMatch(/diasSemana/)
  })

  it('rejects a recurrence without excepciones', () => {
    const file = roundTrip(dataset())
    delete file.datos.compromisos[0].recurrencia.excepciones
    expect(reject(file)[0]).toMatch(/excepciones/)
  })

  it('rejects a list that is not a list', () => {
    const file = roundTrip(dataset())
    file.datos.tareas = 'ninguna'
    expect(reject(file)[0]).toMatch(/"tareas" debería ser una lista/)
  })

  it('reports every problem it finds, not just the first', () => {
    const file = roundTrip(dataset())
    file.datos.ramos[0].color = 'rojo'
    file.datos.evaluaciones[0].fecha = 'ayer'
    expect(reject(file)).toHaveLength(2)
  })
})

describe('validateImportText', () => {
  it('rejects text that is not JSON', () => {
    const result = validateImportText('{ esto no cierra')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errores[0]).toMatch(/no es JSON válido/)
  })

  it('accepts the exact text produced by an export', () => {
    const text = JSON.stringify(buildExport(dataset()))
    expect(validateImportText(text).ok).toBe(true)
  })
})

describe('validateImport — repairs', () => {
  it('keeps a block whose ref dangles and clears the ref', () => {
    const file = roundTrip(dataset())
    file.datos.bloques[0].ref = { tipo: 'evaluacion', id: 'fantasma' }

    const result = validateImport(file)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.datos.bloques).toHaveLength(1)
    expect(result.datos.bloques[0]?.ref).toBeUndefined()
    expect(result.datos.bloques[0]?.titulo).toBe('Estudiar')
    expect(result.avisos[0]).toMatch(/sin el vínculo/)
  })
})
