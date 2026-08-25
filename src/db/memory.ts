import { emptyDataset, type BloqueTiempo, type Dataset } from '../model/types'
import type { DeletePlan } from '../logic/cascade'
import type { PlannerStorage, StoreName } from './storage'

/** Which collection of the Dataset each store name holds. */
const COLLECTION: Record<StoreName, keyof Dataset> = {
  ramos: 'ramos',
  evaluaciones: 'evaluaciones',
  compromisos: 'compromisos',
  tareas: 'tareas',
  bloques: 'bloques',
}

/**
 * The dataset in a variable. Two uses: the storage contract test, which runs
 * in node with no SQLite and no network, and the web before signing in —
 * there is nothing to persist to until there is a session.
 *
 * Atomicity is free here: every method mutates one object, and nothing can
 * fail halfway.
 */
export function openMemoryStorage(initial: Dataset = emptyDataset()): PlannerStorage {
  let data = clone(initial)

  return {
    load: () => Promise.resolve(clone(data)),

    put(store, value) {
      const key = COLLECTION[store]
      const list = data[key] as { id: string }[]
      const at = list.findIndex((item) => item.id === value.id)
      const next = at === -1 ? [...list, value] : list.map((i, n) => (n === at ? value : i))
      data = { ...data, [key]: next } as Dataset
      return Promise.resolve()
    },

    remove(store, id) {
      const key = COLLECTION[store]
      const list = data[key] as { id: string }[]
      data = { ...data, [key]: list.filter((item) => item.id !== id) } as Dataset
      return Promise.resolve()
    },

    applyDeletePlan(plan: DeletePlan, bloquesActualizados: BloqueTiempo[]) {
      const gone = {
        ramos: new Set(plan.ramoIds),
        evaluaciones: new Set(plan.evaluacionIds),
        compromisos: new Set(plan.compromisoIds),
        tareas: new Set(plan.tareaIds),
      }
      const actualizado = new Map(bloquesActualizados.map((b) => [b.id, b]))
      data = {
        ramos: data.ramos.filter((r) => !gone.ramos.has(r.id)),
        evaluaciones: data.evaluaciones.filter((e) => !gone.evaluaciones.has(e.id)),
        compromisos: data.compromisos.filter((c) => !gone.compromisos.has(c.id)),
        tareas: data.tareas.filter((t) => !gone.tareas.has(t.id)),
        bloques: data.bloques.map((b) => actualizado.get(b.id) ?? b),
      }
      return Promise.resolve()
    },

    replaceDataset(dataset) {
      data = clone(dataset)
      return Promise.resolve()
    },
  }
}

/** So a caller mutating what it got back cannot reach into the store. */
const clone = (dataset: Dataset): Dataset => ({
  ramos: [...dataset.ramos],
  evaluaciones: [...dataset.evaluaciones],
  compromisos: [...dataset.compromisos],
  tareas: [...dataset.tareas],
  bloques: [...dataset.bloques],
})
