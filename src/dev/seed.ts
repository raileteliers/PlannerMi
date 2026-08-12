import { addMonths, setDate, startOfMonth } from 'date-fns'
import { newId } from '../lib/id'
import { toISODate, type ISODate } from '../lib/date'
import { usePlannerStore } from '../store/usePlannerStore'
import { emptyDataset, type Dataset, type Evaluacion, type Ramo } from '../model/types'

/**
 * Development fixture: 4 ramos, 12 evaluaciones across two months, two
 * recurring commitments and two one-offs. Dates are relative to today so the
 * month view always has something in it.
 *
 * Loaded from the console: `plannermi.seed()`.
 */
export function buildSeedDataset(hoy = new Date()): Dataset {
  const esteMes = (dia: number): ISODate => toISODate(setDate(startOfMonth(hoy), dia))
  const proximoMes = (dia: number): ISODate =>
    toISODate(setDate(startOfMonth(addMonths(hoy, 1)), dia))

  const ramos: Ramo[] = [
    { id: newId(), nombre: 'Cálculo II', sigla: 'MAT1620', color: 'blue', archivado: false },
    { id: newId(), nombre: 'Física General', sigla: 'FIS1514', color: 'teal', archivado: false },
    { id: newId(), nombre: 'Programación', sigla: 'IIC1103', color: 'violet', archivado: false },
    { id: newId(), nombre: 'Historia del Arte', sigla: 'ART0110', color: 'amber', archivado: false },
  ]
  const [calculo, fisica, prog, arte] = ramos as [Ramo, Ramo, Ramo, Ramo]

  const evaluacion = (
    ramo: Ramo,
    titulo: string,
    fecha: ISODate,
    tipo: Evaluacion['tipo'],
    importancia: Evaluacion['importancia'],
  ): Evaluacion => ({ id: newId(), ramoId: ramo.id, titulo, fecha, tipo, importancia })

  const evaluaciones: Evaluacion[] = [
    evaluacion(calculo, 'Control 1', esteMes(5), 'control', 'baja'),
    evaluacion(calculo, 'Interrogación 1', esteMes(12), 'prueba', 'alta'),
    evaluacion(calculo, 'Control 2', esteMes(26), 'control', 'media'),
    evaluacion(calculo, 'Interrogación 2', proximoMes(16), 'prueba', 'alta'),

    evaluacion(fisica, 'Informe laboratorio 1', esteMes(9), 'entrega', 'media'),
    evaluacion(fisica, 'Prueba 1', esteMes(12), 'prueba', 'media'),
    evaluacion(fisica, 'Informe laboratorio 2', proximoMes(6), 'entrega', 'media'),

    evaluacion(prog, 'Tarea 1', esteMes(9), 'entrega', 'media'),
    evaluacion(prog, 'Tarea 2', esteMes(23), 'entrega', 'alta'),
    evaluacion(prog, 'Examen', proximoMes(24), 'examen', 'alta'),

    evaluacion(arte, 'Ensayo', esteMes(19), 'entrega', 'baja'),
    evaluacion(arte, 'Presentación', proximoMes(9), 'entrega', 'media'),
  ]

  const [control1, interrogacion1] = evaluaciones as [Evaluacion, Evaluacion]

  return {
    ...emptyDataset(),
    ramos,
    evaluaciones,
    compromisos: [
      {
        id: newId(),
        titulo: 'Gimnasio',
        fecha: esteMes(2),
        hora: '19:00',
        duracionMin: 60,
        categoria: 'deporte',
        importancia: 'baja',
        recurrencia: {
          frecuencia: 'semanal',
          intervalo: 1,
          diasSemana: [1, 3, 5],
          excepciones: [esteMes(11)],
        },
      },
      {
        id: newId(),
        titulo: 'Psicólogo',
        fecha: esteMes(6),
        hora: '16:30',
        duracionMin: 50,
        categoria: 'salud',
        importancia: 'media',
        recurrencia: { frecuencia: 'semanal', intervalo: 2, diasSemana: [4], excepciones: [] },
      },
      {
        id: newId(),
        titulo: 'Doctor',
        fecha: esteMes(14),
        hora: '11:00',
        duracionMin: 30,
        categoria: 'salud',
        importancia: 'alta',
      },
      {
        id: newId(),
        titulo: 'Renovar carnet',
        fecha: esteMes(21),
        hora: '09:00',
        categoria: 'tramite',
        importancia: 'media',
      },
    ],
    tareas: [
      { id: newId(), titulo: 'Hacer guía 3', evaluacionId: control1.id, hecha: true },
      { id: newId(), titulo: 'Repasar límites', evaluacionId: interrogacion1.id, hecha: false },
      {
        id: newId(),
        titulo: 'Resolver la guía vieja',
        evaluacionId: interrogacion1.id,
        fecha: esteMes(11),
        hecha: false,
      },
      { id: newId(), titulo: 'Comprar cuaderno', hecha: false },
    ],
  }
}

/** Attached to `window.plannermi` in dev builds only. */
export function installDevTools(): void {
  const store = usePlannerStore
  const api = {
    seed: async (hoy?: string) => {
      const datos = buildSeedDataset(hoy ? new Date(hoy) : new Date())
      const ok = await store.getState().reemplazarTodo(datos)
      console.log(ok ? '[plannermi] seed cargado' : '[plannermi] no se pudo cargar el seed')
      return ok
    },
    limpiar: async () => {
      const ok = await store.getState().reemplazarTodo(emptyDataset())
      console.log(ok ? '[plannermi] base vacía' : '[plannermi] no se pudo vaciar la base')
      return ok
    },
    datos: () => store.getState().datos,
    exportar: () => store.getState().exportar(),
    store,
  }
  Object.assign(window, { plannermi: api })
  console.log('[plannermi] dev tools: plannermi.seed() · plannermi.limpiar() · plannermi.datos()')
}
