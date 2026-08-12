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

export type AppStatus = 'starting' | 'ready' | 'error'

/** Everything except `id`, which the store assigns. */
type New<T extends { id: string }> = Omit<T, 'id'>
type Changes<T extends { id: string }> = Partial<Omit<T, 'id'>>

type CollectionName = keyof Dataset

interface PlannerState {
  status: AppStatus
  /** Set only when the database cannot be opened: the one blocking error. */
  fatalError: string | null
  /** Transient message for the failed-write toast. */
  writeError: string | null
  data: Dataset

  start: () => Promise<void>
  dismissWriteError: () => void

  createRamo: (nuevo: New<Ramo>) => Promise<Ramo | null>
  updateRamo: (id: string, changes: Changes<Ramo>) => Promise<boolean>
  deleteRamo: (id: string) => Promise<boolean>
  planDeleteRamo: (id: string) => DeletePlan

  createEvaluacion: (nueva: New<Evaluacion>) => Promise<Evaluacion | null>
  updateEvaluacion: (id: string, changes: Changes<Evaluacion>) => Promise<boolean>
  deleteEvaluacion: (id: string) => Promise<boolean>
  planDeleteEvaluacion: (id: string) => DeletePlan

  createCompromiso: (nuevo: New<Compromiso>) => Promise<Compromiso | null>
  updateCompromiso: (id: string, changes: Changes<Compromiso>) => Promise<boolean>
  deleteCompromiso: (id: string) => Promise<boolean>

  createTarea: (nueva: New<Tarea>) => Promise<Tarea | null>
  updateTarea: (id: string, changes: Changes<Tarea>) => Promise<boolean>
  deleteTarea: (id: string) => Promise<boolean>

  createBloque: (nuevo: New<BloqueTiempo>) => Promise<BloqueTiempo | null>
  updateBloque: (id: string, changes: Changes<BloqueTiempo>) => Promise<boolean>
  deleteBloque: (id: string) => Promise<boolean>

  /** Import and dev seeding: replaces the whole base in one transaction. */
  replaceAll: (data: Dataset) => Promise<boolean>
  buildExportFile: () => ExportFile
}

/** Held outside the store: it is a connection, not state to render. */
let db: PlannerDB | null = null

const WRITE_ERROR = 'No se pudo guardar'

export const usePlannerStore = create<PlannerState>()((set, get) => {
  /**
   * Write-through with rollback. The UI is updated first so it feels
   * instant, and reverted if IndexedDB refuses — the screen never shows
   * something that was not saved.
   */
  async function commit(
    next: Dataset,
    persist: (db: PlannerDB) => Promise<void>,
  ): Promise<boolean> {
    if (!db) {
      set({ writeError: WRITE_ERROR })
      return false
    }
    const previous = get().data
    set({ data: next, writeError: null })
    try {
      await persist(db)
      return true
    } catch (error) {
      console.error('[plannermi] write failed', error)
      set({ data: previous, writeError: WRITE_ERROR })
      return false
    }
  }

  /** Create → append to the in-memory list → put one record. */
  function makeCreate<K extends CollectionName>(collection: K, store: StoreName) {
    return async (
      values: Omit<Dataset[K][number], 'id'>,
    ): Promise<Dataset[K][number] | null> => {
      const entity = { ...values, id: newId() } as Dataset[K][number]
      const data = get().data
      const next = { ...data, [collection]: [...data[collection], entity] } as Dataset
      const ok = await commit(next, (db) => putRecord(db, store, entity as never))
      return ok ? entity : null
    }
  }

  function makeUpdate<K extends CollectionName>(collection: K, store: StoreName) {
    return async (id: string, changes: object): Promise<boolean> => {
      const data = get().data
      const list = data[collection] as Array<{ id: string }>
      const current = list.find((item) => item.id === id)
      if (!current) return false

      const updated = { ...current, ...changes }
      const next = {
        ...data,
        [collection]: list.map((item) => (item.id === id ? updated : item)),
      } as Dataset
      return commit(next, (db) => putRecord(db, store, updated as never))
    }
  }

  /** Deletes that take nothing with them still go through a plan, so the
   *  block-unlinking rule lives in exactly one place. */
  async function deleteWithPlan(plan: DeletePlan): Promise<boolean> {
    const next = applyDeletePlan(get().data, plan)
    const updatedBloques = next.bloques.filter((b) =>
      plan.bloquesDesvinculados.some((original) => original.id === b.id),
    )
    return commit(next, (db) => applyDeletePlanToDB(db, plan, updatedBloques))
  }

  return {
    status: 'starting',
    fatalError: null,
    writeError: null,
    data: emptyDataset(),

    async start() {
      try {
        db = await openPlannerDB()
        const data = await loadDataset(db)
        set({ data, status: 'ready', fatalError: null })
        // Fire and forget: a refusal changes nothing the user can act on.
        void requestPersistentStorage()
      } catch (error) {
        console.error('[plannermi] could not open the database', error)
        set({ status: 'error', fatalError: 'No se pudo abrir la base de datos' })
      }
    },

    dismissWriteError: () => set({ writeError: null }),

    createRamo: makeCreate('ramos', 'ramos'),
    updateRamo: makeUpdate('ramos', 'ramos'),
    planDeleteRamo: (id) => planDeleteRamo(get().data, id),
    deleteRamo: (id) => deleteWithPlan(planDeleteRamo(get().data, id)),

    createEvaluacion: makeCreate('evaluaciones', 'evaluaciones'),
    updateEvaluacion: makeUpdate('evaluaciones', 'evaluaciones'),
    planDeleteEvaluacion: (id) => planDeleteEvaluacion(get().data, id),
    deleteEvaluacion: (id) => deleteWithPlan(planDeleteEvaluacion(get().data, id)),

    createCompromiso: makeCreate('compromisos', 'compromisos'),
    updateCompromiso: makeUpdate('compromisos', 'compromisos'),
    deleteCompromiso: (id) => deleteWithPlan(planDeleteCompromiso(get().data, id)),

    createTarea: makeCreate('tareas', 'tareas'),
    updateTarea: makeUpdate('tareas', 'tareas'),
    deleteTarea: (id) => deleteWithPlan(planDeleteTarea(get().data, id)),

    createBloque: makeCreate('bloques', 'bloques'),
    updateBloque: makeUpdate('bloques', 'bloques'),
    async deleteBloque(id) {
      const data = get().data
      const next = { ...data, bloques: data.bloques.filter((b) => b.id !== id) }
      return commit(next, (db) => deleteRecord(db, 'bloques', id))
    },

    replaceAll: (data) => commit(data, (db) => replaceDataset(db, data)),

    buildExportFile: () => buildExport(get().data),
  }
})

/** For the dev console and for tests that need the raw handle. */
export const getDB = (): PlannerDB | null => db
