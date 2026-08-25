import { create } from 'zustand'
import type { PlannerStorage, StoreName } from '../db/storage'
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
import type { CambioDeOrden } from '../logic/taskOrder'
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

  /** Takes a factory, not a storage: opening is what can fail. Which one it
   *  opens is decided outside — see `src/db/index.ts`. */
  start: (open: () => Promise<PlannerStorage>) => Promise<void>
  /** Re-read the base. What a sync pull calls once it has written. */
  reload: () => Promise<void>
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
  /** A drop: every task the move renumbered, written as one change. */
  reordenarTareas: (cambios: CambioDeOrden[]) => Promise<boolean>

  createBloque: (nuevo: New<BloqueTiempo>) => Promise<BloqueTiempo | null>
  updateBloque: (id: string, changes: Changes<BloqueTiempo>) => Promise<boolean>
  deleteBloque: (id: string) => Promise<boolean>

  /** Import and dev seeding: replaces the whole base in one transaction. */
  replaceAll: (data: Dataset) => Promise<boolean>
  buildExportFile: () => ExportFile
}

/** Held outside the store: it is a connection, not state to render. */
let storage: PlannerStorage | null = null

const WRITE_ERROR = 'No se pudo guardar'

export const usePlannerStore = create<PlannerState>()((set, get) => {
  /**
   * Write-through with rollback. The UI is updated first so it feels
   * instant, and reverted if SQLite refuses — the screen never shows
   * something that was not saved.
   */
  async function commit(
    next: Dataset,
    persist: (storage: PlannerStorage) => Promise<void>,
  ): Promise<boolean> {
    if (!storage) {
      set({ writeError: WRITE_ERROR })
      return false
    }
    const previous = get().data
    set({ data: next, writeError: null })
    try {
      await persist(storage)
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
      const ok = await commit(next, (s) => s.put(store, entity as never))
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
      return commit(next, (s) => s.put(store, updated as never))
    }
  }

  /** Deletes that take nothing with them still go through a plan, so the
   *  block-unlinking rule lives in exactly one place. */
  async function deleteWithPlan(plan: DeletePlan): Promise<boolean> {
    const next = applyDeletePlan(get().data, plan)
    const updatedBloques = next.bloques.filter((b) =>
      plan.bloquesDesvinculados.some((original) => original.id === b.id),
    )
    return commit(next, (s) => s.applyDeletePlan(plan, updatedBloques))
  }

  return {
    status: 'starting',
    fatalError: null,
    writeError: null,
    data: emptyDataset(),

    async start(open) {
      try {
        // Signing in or out opens a different database; the one being replaced
        // is told, so it can stop whatever it had running.
        storage?.cerrar?.()
        storage = await open()
        const data = await storage.load()
        set({ data, status: 'ready', fatalError: null })
        // No persistence request to make: on a device the database lives in
        // the app's own storage, which only uninstalling clears.
      } catch (error) {
        console.error('[plannermi] could not open the database', error)
        set({ status: 'error', fatalError: 'No se pudo abrir la base de datos' })
      }
    },

    async reload() {
      if (!storage) return
      try {
        set({ data: await storage.load() })
      } catch (error) {
        // A failed reload is not fatal: what is on screen is still what is
        // saved locally, only without whatever the other device just added.
        console.error('[plannermi] reload failed', error)
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

    /**
     * One commit for the whole drop, not one per task. A drag can renumber a
     * dozen rows, and a dozen separate writes means a dozen chances to fail
     * halfway and leave the list in an order nobody asked for.
     */
    async reordenarTareas(cambios) {
      if (cambios.length === 0) return true

      const data = get().data
      const orden = new Map(cambios.map((c) => [c.id, c.orden]))
      const tocadas = data.tareas.flatMap((tarea) => {
        const nuevo = orden.get(tarea.id)
        return nuevo === undefined ? [] : [{ ...tarea, orden: nuevo }]
      })
      if (tocadas.length === 0) return true

      const porId = new Map(tocadas.map((t) => [t.id, t]))
      const next = {
        ...data,
        tareas: data.tareas.map((t) => porId.get(t.id) ?? t),
      }

      return commit(next, async (s) => {
        for (const tarea of tocadas) await s.put('tareas', tarea)
      })
    },

    createBloque: makeCreate('bloques', 'bloques'),
    updateBloque: makeUpdate('bloques', 'bloques'),
    async deleteBloque(id) {
      const data = get().data
      const next = { ...data, bloques: data.bloques.filter((b) => b.id !== id) }
      return commit(next, (s) => s.remove('bloques', id))
    },

    replaceAll: (data) => commit(data, (s) => s.replaceDataset(data)),

    buildExportFile: () => buildExport(get().data),
  }
})

/** For the dev console and for tests that need the raw handle. */
export const getStorage = (): PlannerStorage | null => storage
