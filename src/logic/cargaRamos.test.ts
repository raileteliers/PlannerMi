import { describe, expect, it } from 'vitest'
import {
  VIDA_MEDIA_DIAS,
  cargaDeRamos,
  pesoEvaluacion,
  proporcion,
  proximidad,
} from './cargaRamos'
import type { Dataset, Evaluacion } from '../model/types'

const HOY = '2026-03-10'

const evaluacion = (parcial: Partial<Evaluacion> & { id: string }): Evaluacion => ({
  ramoId: 'R1',
  titulo: 'Prueba',
  fecha: HOY,
  tipo: 'prueba',
  importancia: 'media',
  ...parcial,
})

const vacio = (): Dataset => ({
  ramos: [
    { id: 'R1', nombre: 'Cálculo', color: 'blue', archivado: false },
    { id: 'R2', nombre: 'Física', color: 'teal', archivado: false },
  ],
  evaluaciones: [],
  compromisos: [],
  tareas: [],
  bloques: [],
})

describe('proximidad', () => {
  it('vale 1 el mismo día', () => {
    expect(proximidad(0)).toBe(1)
  })

  it('cae a la mitad en una vida media', () => {
    expect(proximidad(VIDA_MEDIA_DIAS)).toBeCloseTo(0.5)
    expect(proximidad(VIDA_MEDIA_DIAS * 2)).toBeCloseTo(0.25)
  })

  it('decae de forma continua, sin escalones', () => {
    // Un día más nunca deja el peso igual: el orden se mueve todos los días.
    for (let dia = 0; dia < 30; dia++) {
      expect(proximidad(dia + 1)).toBeLessThan(proximidad(dia))
    }
  })

  it('trata una fecha pasada como si fuera hoy, sin crecer', () => {
    expect(proximidad(-5)).toBe(1)
  })
})

describe('pesoEvaluacion', () => {
  it('crece con la importancia', () => {
    const alta = pesoEvaluacion(evaluacion({ id: 'E', importancia: 'alta' }), 0)
    const media = pesoEvaluacion(evaluacion({ id: 'E', importancia: 'media' }), 0)
    const baja = pesoEvaluacion(evaluacion({ id: 'E', importancia: 'baja' }), 0)
    expect(alta).toBeGreaterThan(media)
    expect(media).toBeGreaterThan(baja)
  })

  it('ordena la dificultad examen > prueba > control > entrega', () => {
    const peso = (tipo: Evaluacion['tipo']) =>
      pesoEvaluacion(evaluacion({ id: 'E', tipo }), 0)
    expect(peso('examen')).toBeGreaterThan(peso('prueba'))
    expect(peso('prueba')).toBeGreaterThan(peso('control'))
    expect(peso('control')).toBeGreaterThan(peso('entrega'))
  })

  it('multiplica en vez de sumar: lo difícil y cercano gana a lo fácil y lejano', () => {
    const examenEnUnaSemana = pesoEvaluacion(
      evaluacion({ id: 'E', tipo: 'examen', importancia: 'alta' }),
      7,
    )
    const entregaHoy = pesoEvaluacion(
      evaluacion({ id: 'E', tipo: 'entrega', importancia: 'baja' }),
      0,
    )
    expect(examenEnUnaSemana).toBeGreaterThan(entregaHoy)
  })
})

describe('cargaDeRamos', () => {
  it('pone primero al ramo con la evaluación más pesada', () => {
    const data = vacio()
    data.evaluaciones = [
      evaluacion({ id: 'E1', ramoId: 'R1', tipo: 'entrega', importancia: 'baja' }),
      evaluacion({ id: 'E2', ramoId: 'R2', tipo: 'examen', importancia: 'alta' }),
    ]

    const carga = cargaDeRamos(data, HOY)
    expect(carga.map((c) => c.ramo.id)).toEqual(['R2', 'R1'])
  })

  it('acumula: tres evaluaciones pesan más que una igual', () => {
    const data = vacio()
    data.evaluaciones = [
      evaluacion({ id: 'E1', ramoId: 'R1' }),
      evaluacion({ id: 'E2', ramoId: 'R1', fecha: '2026-03-11' }),
      evaluacion({ id: 'E3', ramoId: 'R1', fecha: '2026-03-12' }),
      evaluacion({ id: 'E4', ramoId: 'R2' }),
    ]

    const [primero] = cargaDeRamos(data, HOY)
    expect(primero?.ramo.id).toBe('R1')
    expect(primero?.pendientes).toBe(3)
  })

  it('lo mismo pesa menos cuanto más lejos está', () => {
    const cerca = vacio()
    cerca.evaluaciones = [evaluacion({ id: 'E1', fecha: '2026-03-12' })]
    const lejos = vacio()
    lejos.evaluaciones = [evaluacion({ id: 'E1', fecha: '2026-04-30' })]

    const puntajeCerca = cargaDeRamos(cerca, HOY)[0]?.puntaje ?? 0
    const puntajeLejos = cargaDeRamos(lejos, HOY)[0]?.puntaje ?? 0
    expect(puntajeCerca).toBeGreaterThan(puntajeLejos)
  })

  it('ignora lo que ya pasó', () => {
    const data = vacio()
    data.evaluaciones = [evaluacion({ id: 'E1', fecha: '2026-03-01' })]

    const [primero] = cargaDeRamos(data, HOY)
    expect(primero?.puntaje).toBe(0)
    expect(primero?.pendientes).toBe(0)
  })

  it('cuenta lo de hoy: el día todavía no termina', () => {
    const data = vacio()
    data.evaluaciones = [evaluacion({ id: 'E1', fecha: HOY })]

    const [primero] = cargaDeRamos(data, HOY)
    expect(primero?.pendientes).toBe(1)
    expect(primero?.diasHastaProxima).toBe(0)
  })

  it('deja fuera los ramos archivados', () => {
    const data = vacio()
    data.ramos[1] = { ...data.ramos[1]!, archivado: true }
    data.evaluaciones = [evaluacion({ id: 'E1', ramoId: 'R2', tipo: 'examen' })]

    const carga = cargaDeRamos(data, HOY)
    expect(carga.map((c) => c.ramo.id)).toEqual(['R1'])
  })

  it('conserva los ramos sin nada por delante, al final y en orden estable', () => {
    const data = vacio()
    data.ramos.push({ id: 'R3', nombre: 'Álgebra', color: 'green', archivado: false })
    data.evaluaciones = [evaluacion({ id: 'E1', ramoId: 'R2' })]

    const carga = cargaDeRamos(data, HOY)
    // Física carga, después los dos vacíos por orden alfabético.
    expect(carga.map((c) => c.ramo.nombre)).toEqual(['Física', 'Álgebra', 'Cálculo'])
  })

  it('nombra la próxima evaluación, no una cualquiera', () => {
    const data = vacio()
    data.evaluaciones = [
      evaluacion({ id: 'E1', ramoId: 'R1', titulo: 'Lejana', fecha: '2026-04-01' }),
      evaluacion({ id: 'E2', ramoId: 'R1', titulo: 'Cercana', fecha: '2026-03-13' }),
    ]

    const [primero] = cargaDeRamos(data, HOY)
    expect(primero?.proxima?.titulo).toBe('Cercana')
    expect(primero?.diasHastaProxima).toBe(3)
  })
})

describe('proporcion', () => {
  it('da 1 al máximo y 0 cuando no hay nada', () => {
    expect(proporcion(8, 8)).toBe(1)
    expect(proporcion(0, 0)).toBe(0)
  })

  it('acota entre 0 y 1', () => {
    expect(proporcion(4, 8)).toBe(0.5)
    expect(proporcion(12, 8)).toBe(1)
    expect(proporcion(-3, 8)).toBe(0)
  })
})
