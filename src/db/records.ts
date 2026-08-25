import { emptyDataset, type Dataset } from '../model/types'
import { ALL_STORES, type StoreName } from './storage'

/** A row of `public.records`, as the app sends and receives it. */
export interface RecordRow {
  kind: StoreName
  id: string
  data: unknown
}

const IS_STORE = new Set<string>(ALL_STORES)

/** What one side changed since a moment in time. */
export interface Cambios {
  registros: RecordRow[]
  borrados: { kind: StoreName; id: string }[]
  /** The server's clock at the moment of the read; the next `desde`. */
  hasta: string
}

/** The five arrays flattened into rows. `user_id` is the server's business. */
export function datasetToRows(dataset: Dataset): RecordRow[] {
  return ALL_STORES.flatMap((kind) =>
    dataset[kind].map((entity) => ({ kind, id: entity.id, data: entity })),
  )
}

/**
 * Rows back into a Dataset.
 *
 * Rows of an unknown `kind` are dropped rather than thrown on: a newer version
 * of the app writing a kind this one does not have yet should not stop this
 * one from opening. The check constraint keeps out anything truly foreign.
 */
export function rowsToDataset(rows: RecordRow[]): Dataset {
  const dataset = emptyDataset()
  for (const row of rows) {
    if (!IS_STORE.has(row.kind)) continue
    ;(dataset[row.kind] as unknown[]).push(row.data)
  }
  return dataset
}
