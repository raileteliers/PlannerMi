import { create } from 'zustand'
import {
  applyDeletePlanToDB,
  deleteRecord,
  loadDataset,
  openPlannerDB,
  putRecord,
  replaceDataset,
  type PlannerDB,
  type StoreName,
} from '../db/schema'
import { requestPersistentStorage } from '../db/persist'
import {
  applyDeletePlan,
  planDeleteCompromiso,
  planDeleteEvaluacion,
  planDeleteRamo,
  planDeleteTarea,
  type DeletePlan,
} from '../logic/cascade'
import { buildExport, type ExportFile } from '../logic/importExport'
import { newId } from '../lib/id'
import {
  emptyDataset,
  type BloqueTiempo,
  type Compromiso,
  type Dataset,
  type Evaluacion,
  type Ramo,
  type Tarea,
} from '../model/types'

export type EstadoApp = 'iniciando' | 'listo' | 'error'

/** Everything except `id`, which the store assigns. */
type Nuevo<T extends { id: string }> = Omit<T, 'id'>
type Cambios<T extends { id: string }> = Partial<Omit<T, 'id'>>

interface PlannerState {
  estado: EstadoApp
  /** Set only when the database cannot be opened: the one blocking error. */
  errorFatal: string | null
  /** Transient message for the failed-write toast. */
  mensajeError: string | null
  datos: Dataset

  iniciar: () => Promise<void>
  descartarError: () => void

  crearRamo: (nuevo: Nuevo<Ramo>) => Promise<Ramo | null>
  actualizarRamo: (id: string, cambios: Cambios<Ramo>) => Promise<boolean>
  eliminarRamo: (id: string) => Promise<boolean>
  planEliminarRamo: (id: string) => DeletePlan

  crearEvaluacion: (nuevo: Nuevo<Evaluacion>) => Promise<Evaluacion | null>
  actualizarEvaluacion: (id: string, cambios: Cambios<Evaluacion>) => Promise<boolean>
  eliminarEvaluacion: (id: string) => Promise<boolean>

  crearCompromiso: (nuevo: Nuevo<Compromiso>) => Promise<Compromiso | null>
  actualizarCompromiso: (id: string, cambios: Cambios<Compromiso>) => Promise<boolean>
  eliminarCompromiso: (id: string) => Promise<boolean>

  crearTarea: (nuevo: Nuevo<Tarea>) => Promise<Tarea | null>
  actualizarTarea: (id: string, cambios: Cambios<Tarea>) => Promise<boolean>
  eliminarTarea: (id: string) => Promise<boolean>

  crearBloque: (nuevo: Nuevo<BloqueTiempo>) => Promise<BloqueTiempo | null>
  actualizarBloque: (id: string, cambios: Cambios<BloqueTiempo>) => Promise<boolean>
  eliminarBloque: (id: string) => Promise<boolean>

  /** Import and dev seeding: replaces the whole base in one transaction. */
  reemplazarTodo: (datos: Dataset) => Promise<boolean>
  exportar: () => ExportFile
}

/** Held outside the store: it is a connection, not state to render. */
let db: PlannerDB | null = null

const ERROR_ESCRITURA = 'No se pudo guardar'

export const usePlannerStore = create<PlannerState>()((set, get) => {
  /**
   * Write-through with rollback. The UI is updated first so it feels
   * instant, and reverted if IndexedDB refuses — the screen never shows
   * something that was not saved.
   */
  async function commit(
    siguiente: Dataset,
    persistir: (db: PlannerDB) => Promise<void>,
  ): Promise<boolean> {
    if (!db) {
      set({ mensajeError: ERROR_ESCRITURA })
      return false
    }
    const anterior = get().datos
    set({ datos: siguiente, mensajeError: null })
    try {
      await persistir(db)
      return true
    } catch (error) {
      console.error('[plannermi] write failed', error)
      set({ datos: anterior, mensajeError: ERROR_ESCRITURA })
      return false
    }
  }

  /** Create → append to the in-memory list → put one record. */
  function crear<K extends 'ramos' | 'evaluaciones' | 'compromisos' | 'tareas' | 'bloques'>(
    coleccion: K,
    store: StoreName,
  ) {
    return async (nuevo: Omit<Dataset[K][number], 'id'>): Promise<Dataset[K][number] | null> => {
      const entidad = { ...nuevo, id: newId() } as Dataset[K][number]
      const datos = get().datos
      const siguiente = { ...datos, [coleccion]: [...datos[coleccion], entidad] } as Dataset
      const ok = await commit(siguiente, (db) =>
        putRecord(db, store, entidad as never),
      )
      return ok ? entidad : null
    }
  }

  function actualizar<K extends 'ramos' | 'evaluaciones' | 'compromisos' | 'tareas' | 'bloques'>(
    coleccion: K,
    store: StoreName,
  ) {
    return async (id: string, cambios: object): Promise<boolean> => {
      const datos = get().datos
      const lista = datos[coleccion] as Array<{ id: string }>
      const actual = lista.find((item) => item.id === id)
      if (!actual) return false

      const actualizado = { ...actual, ...cambios }
      const siguiente = {
        ...datos,
        [coleccion]: lista.map((item) => (item.id === id ? actualizado : item)),
      } as Dataset
      return commit(siguiente, (db) => putRecord(db, store, actualizado as never))
    }
  }

  /** Deletes that take nothing with them still go through a plan, so the
   *  block-unlinking rule lives in exactly one place. */
  async function eliminarConPlan(plan: DeletePlan): Promise<boolean> {
    const datos = get().datos
    const siguiente = applyDeletePlan(datos, plan)
    const bloquesActualizados = siguiente.bloques.filter((b) =>
      plan.bloquesDesvinculados.some((original) => original.id === b.id),
    )
    return commit(siguiente, (db) =>
      applyDeletePlanToDB(db, plan, bloquesActualizados),
    )
  }

  return {
    estado: 'iniciando',
    errorFatal: null,
    mensajeError: null,
    datos: emptyDataset(),

    async iniciar() {
      try {
        db = await openPlannerDB()
        const datos = await loadDataset(db)
        set({ datos, estado: 'listo', errorFatal: null })
        // Fire and forget: a refusal changes nothing the user can act on.
        void requestPersistentStorage()
      } catch (error) {
        console.error('[plannermi] could not open the database', error)
        set({
          estado: 'error',
          errorFatal: 'No se pudo abrir la base de datos',
        })
      }
    },

    descartarError: () => set({ mensajeError: null }),

    crearRamo: crear('ramos', 'ramos'),
    actualizarRamo: actualizar('ramos', 'ramos'),
    planEliminarRamo: (id) => planDeleteRamo(get().datos, id),
    eliminarRamo: (id) => eliminarConPlan(planDeleteRamo(get().datos, id)),

    crearEvaluacion: crear('evaluaciones', 'evaluaciones'),
    actualizarEvaluacion: actualizar('evaluaciones', 'evaluaciones'),
    eliminarEvaluacion: (id) => eliminarConPlan(planDeleteEvaluacion(get().datos, id)),

    crearCompromiso: crear('compromisos', 'compromisos'),
    actualizarCompromiso: actualizar('compromisos', 'compromisos'),
    eliminarCompromiso: (id) => eliminarConPlan(planDeleteCompromiso(get().datos, id)),

    crearTarea: crear('tareas', 'tareas'),
    actualizarTarea: actualizar('tareas', 'tareas'),
    eliminarTarea: (id) => eliminarConPlan(planDeleteTarea(get().datos, id)),

    crearBloque: crear('bloques', 'bloques'),
    actualizarBloque: actualizar('bloques', 'bloques'),
    async eliminarBloque(id) {
      const datos = get().datos
      const siguiente = {
        ...datos,
        bloques: datos.bloques.filter((b) => b.id !== id),
      }
      return commit(siguiente, (db) => deleteRecord(db, 'bloques', id))
    },

    reemplazarTodo: (datos) => commit(datos, (db) => replaceDataset(db, datos)),

    exportar: () => buildExport(get().datos),
  }
})

/** For the dev console and for tests that need the raw handle. */
export const getDB = (): PlannerDB | null => db
