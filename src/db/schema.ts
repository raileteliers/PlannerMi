import * as SQLite from 'expo-sqlite'
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

export const DB_NAME = 'plannermi.db'
export const DB_VERSION = 1

/**
 * Every table is `id TEXT PRIMARY KEY, data TEXT NOT NULL`, the row being the
 * entity as JSON.
 *
 * A column per field would let SQL filter, but nothing in the app filters in
 * SQL: `loadDataset` reads the whole base once at startup — hundreds of
 * records — and every screen selects from that in memory. Columns would be a
 * second copy of `model/types.ts` to keep in sync for a query nobody makes.
 * What SQLite is here for is the transaction, which the cascade delete and the
 * import both need, and that works the same either way.
 */
export interface StoreValues {
  ramos: Ramo
  evaluaciones: Evaluacion
  compromisos: Compromiso
  tareas: Tarea
  bloques: BloqueTiempo
}

export type StoreName = keyof StoreValues

export type PlannerDB = SQLite.SQLiteDatabase

const ALL_STORES: StoreName[] = [
  'ramos',
  'evaluaciones',
  'compromisos',
  'tareas',
  'bloques',
]

interface Row {
  data: string
}

/**
 * Single place where the schema version lives. Every future migration is one
 * more `if (version < n)` branch here, tracked by SQLite's own `user_version`.
 */
export async function openPlannerDB(): Promise<PlannerDB> {
  const db = await SQLite.openDatabaseAsync(DB_NAME)

  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  )
  const version = result?.user_version ?? 0

  if (version < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      ${ALL_STORES.map(
        (store) =>
          `CREATE TABLE IF NOT EXISTS ${store} (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);`,
      ).join('\n')}
      PRAGMA user_version = ${DB_VERSION};
    `)
  }

  return db
}

/** The whole base, read once at startup. Hundreds of records. */
export async function loadDataset(db: PlannerDB): Promise<Dataset> {
  const [ramos, evaluaciones, compromisos, tareas, bloques] = await Promise.all(
    ALL_STORES.map((store) => readAll(db, store)),
  )
  return {
    ramos: ramos as Ramo[],
    evaluaciones: evaluaciones as Evaluacion[],
    compromisos: compromisos as Compromiso[],
    tareas: tareas as Tarea[],
    bloques: bloques as BloqueTiempo[],
  }
}

async function readAll(db: PlannerDB, store: StoreName): Promise<unknown[]> {
  const rows = await db.getAllAsync<Row>(`SELECT data FROM ${store}`)
  return rows.map((row) => JSON.parse(row.data) as unknown)
}

export async function putRecord<S extends StoreName>(
  db: PlannerDB,
  store: S,
  value: StoreValues[S],
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO ${store} (id, data) VALUES (?, ?)`,
    value.id,
    JSON.stringify(value),
  )
}

export async function deleteRecord(
  db: PlannerDB,
  store: StoreName,
  id: string,
): Promise<void> {
  await db.runAsync(`DELETE FROM ${store} WHERE id = ?`, id)
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
  await db.withTransactionAsync(async () => {
    await deleteMany(db, 'ramos', plan.ramoIds)
    await deleteMany(db, 'evaluaciones', plan.evaluacionIds)
    await deleteMany(db, 'compromisos', plan.compromisoIds)
    await deleteMany(db, 'tareas', plan.tareaIds)
    for (const bloque of bloquesActualizados) {
      await putRecord(db, 'bloques', bloque)
    }
  })
}

async function deleteMany(
  db: PlannerDB,
  store: StoreName,
  ids: string[],
): Promise<void> {
  for (const id of ids) {
    await db.runAsync(`DELETE FROM ${store} WHERE id = ?`, id)
  }
}

/** Import: wipe and rewrite in a single transaction. */
export async function replaceDataset(
  db: PlannerDB,
  dataset: Dataset,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const store of ALL_STORES) {
      await db.runAsync(`DELETE FROM ${store}`)
    }
    await writeAll(db, 'ramos', dataset.ramos)
    await writeAll(db, 'evaluaciones', dataset.evaluaciones)
    await writeAll(db, 'compromisos', dataset.compromisos)
    await writeAll(db, 'tareas', dataset.tareas)
    await writeAll(db, 'bloques', dataset.bloques)
  })
}

async function writeAll<S extends StoreName>(
  db: PlannerDB,
  store: S,
  values: StoreValues[S][],
): Promise<void> {
  for (const value of values) {
    await putRecord(db, store, value)
  }
}

export const clearDataset = (db: PlannerDB): Promise<void> =>
  replaceDataset(db, emptyDataset())
