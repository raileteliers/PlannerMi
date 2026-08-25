import type { SupabaseClient } from '@supabase/supabase-js'
import type { BloqueTiempo, Dataset } from '../model/types'
import type { DeletePlan } from '../logic/cascade'
import { rowsToDataset, type Cambios, type RecordRow } from './records'
import type { RemoteStorage } from './synced'
import type { StoreName } from './storage'

/** PostgREST caps a response at 1000 rows unless asked otherwise. */
const PAGINA = 1000

/**
 * The shared database, as a storage.
 *
 * The two writes that must be all-or-nothing go through the plpgsql functions
 * in supabase/migrations/0002_transactions.sql — a function call is a
 * transaction, and doing them as several requests from here would allow a half
 * -applied cascade delete, a state nothing in the app knows how to recover from.
 */
export function openSupabaseStorage(
  client: SupabaseClient,
  userId: string,
): RemoteStorage {
  return {
    async load(): Promise<Dataset> {
      // Paged rather than one big select: the cap is silent, and a truncated
      // dataset would look exactly like data that went missing.
      const rows = await paginar((from, to) =>
        client.from('records').select('kind, id, data').order('kind').order('id').range(from, to),
      )
      return rowsToDataset(rows as RecordRow[])
    },

    async put(store, value) {
      // The row carries its owner and RLS checks it against the caller, so a
      // row written for someone else is rejected rather than accepted quietly.
      const { error } = await client.from('records').upsert(
        { user_id: userId, kind: store, id: value.id, data: value },
        { onConflict: 'user_id,kind,id' },
      )
      if (error) throw error
    },

    async remove(store, id) {
      const { error } = await client.rpc('delete_record', {
        p_kind: store,
        p_id: id,
      })
      if (error) throw error
    },

    async applyDeletePlan(plan: DeletePlan, bloquesActualizados: BloqueTiempo[]) {
      const { error } = await client.rpc('apply_delete_plan', {
        p_plan: plan,
        p_bloques: bloquesActualizados,
      })
      if (error) throw error
    },

    async replaceDataset(dataset: Dataset) {
      const { error } = await client.rpc('replace_dataset', { p_datos: dataset })
      if (error) throw error
    },

    /**
     * What changed on the server since `desde`, for the phone to catch up on.
     *
     * `hasta` is read from the server and not from the device: it becomes the
     * next `desde`, and a phone whose clock is off by a minute would either
     * skip changes or drag the same ones back forever.
     *
     * The window is half-open on purpose — rows are asked for with `gt`, so a
     * record written in the same instant as the previous cutoff is not fetched
     * twice. Records and tombstones both come back; a row that appears in both
     * was deleted after it was written, and `aplicarRemoto` applies the
     * deletions last.
     */
    async cambiosDesde(desde: string | null): Promise<Cambios> {
      const { data: ahora, error: errorReloj } = await client.rpc('server_now')
      if (errorReloj) throw errorReloj

      const registros = await paginar((from, to) => {
        let q = client.from('records').select('kind, id, data').range(from, to)
        if (desde) q = q.gt('updated_at', desde)
        return q.order('updated_at')
      })

      const borrados = await paginar((from, to) => {
        let q = client.from('deletions').select('kind, id').range(from, to)
        if (desde) q = q.gt('deleted_at', desde)
        return q.order('deleted_at')
      })

      return {
        registros: registros as RecordRow[],
        borrados: borrados as { kind: StoreName; id: string }[],
        hasta: ahora as string,
      }
    },
  }
}

/** PostgREST's row cap is silent, so every list read walks the pages. */
async function paginar(
  consulta: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<unknown[]> {
  const filas: unknown[] = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await consulta(desde, desde + PAGINA - 1)
    if (error) throw error
    filas.push(...(data ?? []))
    if ((data?.length ?? 0) < PAGINA) break
  }
  return filas
}
