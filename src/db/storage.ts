import type { DeletePlan } from '../logic/cascade'
import type {
  BloqueTiempo,
  Compromiso,
  Dataset,
  Evaluacion,
  Ramo,
  Tarea,
} from '../model/types'

/**
 * The five collections, by the name they are stored under. Domain, not
 * SQLite: Postgres and the in-memory store use the same names.
 */
export interface StoreValues {
  ramos: Ramo
  evaluaciones: Evaluacion
  compromisos: Compromiso
  tareas: Tarea
  bloques: BloqueTiempo
}

export type StoreName = keyof StoreValues

export const ALL_STORES: StoreName[] = [
  'ramos',
  'evaluaciones',
  'compromisos',
  'tareas',
  'bloques',
]

/**
 * Everything the app needs from a database, and nothing else.
 *
 * Stateful on purpose: the connection — or the client and the user id, for a
 * remote one — is captured in the closure, so the store never learns which
 * implementation it is talking to. `usePlannerStore` holds one of these and
 * calls five methods; swapping SQLite for Supabase is swapping the object.
 *
 * `applyDeletePlan` and `replaceDataset` are the two operations that must be
 * all-or-nothing. Every implementation owes that guarantee: a cascade delete
 * that half-applies leaves orphans the app has no way to find.
 */
export interface PlannerStorage {
  /** The whole base, read once at startup. Hundreds of records. */
  load(): Promise<Dataset>
  put<S extends StoreName>(store: S, value: StoreValues[S]): Promise<void>
  remove(store: StoreName, id: string): Promise<void>
  /** Atomic: every entity goes and every orphaned block loses its ref. */
  applyDeletePlan(
    plan: DeletePlan,
    bloquesActualizados: BloqueTiempo[],
  ): Promise<void>
  /** Atomic: wipe and rewrite. Import and dev seeding. */
  replaceDataset(dataset: Dataset): Promise<void>
  /** Let go of anything held outside — listeners, timers. Optional. */
  cerrar?(): void
}
