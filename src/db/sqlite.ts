import * as SQLite from 'expo-sqlite'
import { ALL_STORES, type PlannerStorage, type StoreName, type StoreValues } from './storage'
import type { Cambios } from './records'
import type { OutboxEntry, OutboxOp } from './outbox'
import type { BloqueTiempo, Dataset, Ramo, Evaluacion, Compromiso, Tarea } from '../model/types'
import type { DeletePlan } from '../logic/cascade'

export const DB_NAME = 'plannermi.db'
export const DB_VERSION = 2

/**
 * Every table is `id TEXT PRIMARY KEY, data TEXT NOT NULL`, the row being the
 * entity as JSON.
 *
 * A column per field would let SQL filter, but nothing in the app filters in
 * SQL: `load` reads the whole base once at startup — hundreds of records —
 * and every screen selects from that in memory. Columns would be a second
 * copy of `model/types.ts` to keep in sync for a query nobody makes. What
 * SQLite is here for is the transaction, which the cascade delete and the
 * import both need, and that works the same either way.
 */
export type PlannerDB = SQLite.SQLiteDatabase

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
    `)
  }

  // v2 adds the two tables sync needs. The data already on the phone stays put
  // and is pushed up by the first drain.
  if (version < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS outbox (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        op TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS meta (
        clave TEXT PRIMARY KEY NOT NULL,
        valor TEXT NOT NULL
      );
    `)
  }

  if (version < DB_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${DB_VERSION};`)
  }

  return db
}

/**
 * The local database. A PlannerStorage, plus what syncing needs on top: the
 * queue of writes that have not reached the server, and a way to apply what
 * came back from it.
 */
export interface LocalStorage extends PlannerStorage {
  /** Queued writes, oldest first. */
  pendientes(): Promise<OutboxEntry[]>
  /** Forget the entries the server has accepted. */
  confirmar(seqs: number[]): Promise<void>
  leerMeta(clave: string): Promise<string | null>
  guardarMeta(clave: string, valor: string): Promise<void>
  /** Write what the server sent. Never queued: it came from there. */
  aplicarRemoto(cambios: Cambios): Promise<void>
}

export async function openSqliteStorage(): Promise<LocalStorage> {
  return sqliteStorage(await openPlannerDB())
}

/**
 * `enColaDeSalida` is what signing in turns on. Off, every write is a plain
 * local write and nothing accumulates — the app as it was before any of this.
 *
 * The queue entry is written inside the same transaction as the change it
 * describes, so "saved but not queued" is a state that cannot happen: it would
 * be an edit that silently never syncs.
 */
export function sqliteStorage(
  db: PlannerDB,
  enColaDeSalida = false,
): LocalStorage {
  const encolar = (op: OutboxOp): Promise<void> =>
    enColaDeSalida
      ? db
          .runAsync('INSERT INTO outbox (op, payload) VALUES (?, ?)', op.op, JSON.stringify(op))
          .then(() => undefined)
      : Promise.resolve()

  return {
    load: () => loadDataset(db),

    async put(store, value) {
      await db.withTransactionAsync(async () => {
        await putRecord(db, store, value)
        await encolar({ op: 'put', kind: store, value })
      })
    },

    async remove(store, id) {
      await db.withTransactionAsync(async () => {
        await deleteRecord(db, store, id)
        await encolar({ op: 'remove', kind: store, id })
      })
    },

    async applyDeletePlan(plan, bloques) {
      await db.withTransactionAsync(async () => {
        await applyDeletePlanToDB(db, plan, bloques)
        await encolar({ op: 'plan', plan, bloques })
      })
    },

    async replaceDataset(dataset) {
      await db.withTransactionAsync(async () => {
        // A replace makes every queued write moot: it wipes first.
        if (enColaDeSalida) await db.runAsync('DELETE FROM outbox')
        await replaceDatasetInTransaction(db, dataset)
        await encolar({ op: 'replace', dataset })
      })
    },

    async pendientes() {
      const rows = await db.getAllAsync<{ seq: number; payload: string }>(
        'SELECT seq, payload FROM outbox ORDER BY seq',
      )
      return rows.map((row) => ({
        seq: row.seq,
        op: JSON.parse(row.payload) as OutboxOp,
      }))
    },

    async confirmar(seqs) {
      if (seqs.length === 0) return
      await db.withTransactionAsync(async () => {
        for (const seq of seqs) {
          await db.runAsync('DELETE FROM outbox WHERE seq = ?', seq)
        }
      })
    },

    async leerMeta(clave) {
      const row = await db.getFirstAsync<{ valor: string }>(
        'SELECT valor FROM meta WHERE clave = ?',
        clave,
      )
      return row?.valor ?? null
    },

    async guardarMeta(clave, valor) {
      await db.runAsync(
        'INSERT OR REPLACE INTO meta (clave, valor) VALUES (?, ?)',
        clave,
        valor,
      )
    },

    async aplicarRemoto(cambios: Cambios) {
      await db.withTransactionAsync(async () => {
        for (const registro of cambios.registros) {
          await db.runAsync(
            `INSERT OR REPLACE INTO ${registro.kind} (id, data) VALUES (?, ?)`,
            registro.id,
            JSON.stringify(registro.data),
          )
        }
        for (const borrado of cambios.borrados) {
          await db.runAsync(`DELETE FROM ${borrado.kind} WHERE id = ?`, borrado.id)
        }
      })
    },
  }
}

async function loadDataset(db: PlannerDB): Promise<Dataset> {
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

async function putRecord<S extends StoreName>(
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

async function deleteRecord(
  db: PlannerDB,
  store: StoreName,
  id: string,
): Promise<void> {
  await db.runAsync(`DELETE FROM ${store} WHERE id = ?`, id)
}

/**
 * A cascade delete: every entity goes and every orphaned block loses its ref.
 * The caller owns the transaction, so this is all-or-nothing together with the
 * outbox entry that describes it.
 */
async function applyDeletePlanToDB(
  db: PlannerDB,
  plan: DeletePlan,
  bloquesActualizados: BloqueTiempo[],
): Promise<void> {
  await deleteMany(db, 'ramos', plan.ramoIds)
  await deleteMany(db, 'evaluaciones', plan.evaluacionIds)
  await deleteMany(db, 'compromisos', plan.compromisoIds)
  await deleteMany(db, 'tareas', plan.tareaIds)
  for (const bloque of bloquesActualizados) {
    await putRecord(db, 'bloques', bloque)
  }
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

/** Import: wipe and rewrite. The caller owns the transaction. */
async function replaceDatasetInTransaction(
  db: PlannerDB,
  dataset: Dataset,
): Promise<void> {
    for (const store of ALL_STORES) {
      await db.runAsync(`DELETE FROM ${store}`)
    }
    await writeAll(db, 'ramos', dataset.ramos)
    await writeAll(db, 'evaluaciones', dataset.evaluaciones)
    await writeAll(db, 'compromisos', dataset.compromisos)
    await writeAll(db, 'tareas', dataset.tareas)
    await writeAll(db, 'bloques', dataset.bloques)
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
