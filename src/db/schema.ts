import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import {
  emptyDataset,
  type BloqueTiempo,
  type Compromiso,
  type Dataset,
  type Evaluacion,
  type Ramo,
  type Tarea,
} from '../model/types'
import type { DeletePlan } from '../logic/cascade'

export const DB_NAME = 'plannermi'
export const DB_VERSION = 1

export interface PlannerMiDB extends DBSchema {
  ramos: { key: string; value: Ramo }
  evaluaciones: {
    key: string
    value: Evaluacion
    indexes: { 'by-ramo': string; 'by-fecha': string }
  }
  compromisos: { key: string; value: Compromiso }
  tareas: { key: string; value: Tarea; indexes: { 'by-evaluacion': string } }
  bloques: { key: string; value: BloqueTiempo; indexes: { 'by-fecha': string } }
}

export type PlannerDB = IDBPDatabase<PlannerMiDB>

export type StoreName = 'ramos' | 'evaluaciones' | 'compromisos' | 'tareas' | 'bloques'
const ALL_STORES: StoreName[] = [
  'ramos',
  'evaluaciones',
  'compromisos',
  'tareas',
  'bloques',
]

/**
 * Single place where the schema version lives. Every future migration is one
 * more `if (oldVersion < n)` branch here.
 */
export function openPlannerDB(): Promise<PlannerDB> {
  return openDB<PlannerMiDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('ramos', { keyPath: 'id' })

        const evaluaciones = db.createObjectStore('evaluaciones', { keyPath: 'id' })
        evaluaciones.createIndex('by-ramo', 'ramoId')
        evaluaciones.createIndex('by-fecha', 'fecha')

        db.createObjectStore('compromisos', { keyPath: 'id' })

        const tareas = db.createObjectStore('tareas', { keyPath: 'id' })
        // Loose tasks have no evaluacionId and simply stay out of this index.
        tareas.createIndex('by-evaluacion', 'evaluacionId')

        const bloques = db.createObjectStore('bloques', { keyPath: 'id' })
        bloques.createIndex('by-fecha', 'fecha')
      }
    },
  })
}

/** The whole base, read once at startup. Hundreds of records. */
export async function loadDataset(db: PlannerDB): Promise<Dataset> {
  const [ramos, evaluaciones, compromisos, tareas, bloques] = await Promise.all([
    db.getAll('ramos'),
    db.getAll('evaluaciones'),
    db.getAll('compromisos'),
    db.getAll('tareas'),
    db.getAll('bloques'),
  ])
  return { ramos, evaluaciones, compromisos, tareas, bloques }
}

export async function putRecord<S extends StoreName>(
  db: PlannerDB,
  store: S,
  value: PlannerMiDB[S]['value'],
): Promise<void> {
  await db.put(store, value)
}

export async function deleteRecord(
  db: PlannerDB,
  store: StoreName,
  id: string,
): Promise<void> {
  await db.delete(store, id)
}

/**
 * A cascade delete in one transaction: either every entity goes and every
 * orphaned block loses its ref, or nothing changes.
 */
export async function applyDeletePlanToDB(
  db: PlannerDB,
  plan: DeletePlan,
  bloquesActualizados: BloqueTiempo[],
): Promise<void> {
  const tx = db.transaction(ALL_STORES, 'readwrite')
  await Promise.all([
    ...plan.ramoIds.map((id) => tx.objectStore('ramos').delete(id)),
    ...plan.evaluacionIds.map((id) => tx.objectStore('evaluaciones').delete(id)),
    ...plan.compromisoIds.map((id) => tx.objectStore('compromisos').delete(id)),
    ...plan.tareaIds.map((id) => tx.objectStore('tareas').delete(id)),
    ...bloquesActualizados.map((b) => tx.objectStore('bloques').put(b)),
    tx.done,
  ])
}

/** Import: wipe and rewrite in a single transaction. */
export async function replaceDataset(db: PlannerDB, dataset: Dataset): Promise<void> {
  const tx = db.transaction(ALL_STORES, 'readwrite')
  await Promise.all([
    ...ALL_STORES.map((store) => tx.objectStore(store).clear()),
    ...dataset.ramos.map((r) => tx.objectStore('ramos').put(r)),
    ...dataset.evaluaciones.map((e) => tx.objectStore('evaluaciones').put(e)),
    ...dataset.compromisos.map((c) => tx.objectStore('compromisos').put(c)),
    ...dataset.tareas.map((t) => tx.objectStore('tareas').put(t)),
    ...dataset.bloques.map((b) => tx.objectStore('bloques').put(b)),
    tx.done,
  ])
}

export const clearDataset = (db: PlannerDB): Promise<void> =>
  replaceDataset(db, emptyDataset())
