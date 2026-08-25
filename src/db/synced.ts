import { AppState } from 'react-native'
import type { Cambios } from './records'
import { aplicarOp, colapsarOutbox } from './outbox'
import { datasetToRows } from './records'
import type { LocalStorage } from './sqlite'
import type { PlannerStorage } from './storage'

/** A remote storage that can also say what changed since a given moment. */
export interface RemoteStorage extends PlannerStorage {
  cambiosDesde(desde: string | null): Promise<Cambios>
}

const ULTIMO_PULL = 'ultimoPull'

export interface SyncedOptions {
  /** Called after a pull wrote something, so the screen can reload. */
  alCambiar?: () => void
  /** Called when a sync fails, so it can be shown discreetly. */
  alFallar?: (error: unknown) => void
}

/**
 * The phone's storage once there is a session: local first, server after.
 *
 * Reads never touch the network — the screen is drawn from SQLite, so the app
 * opens instantly and works in a tunnel. Writes land in SQLite and in the
 * outbox in one transaction, and a drain is kicked off in the background; if
 * it fails, nothing is lost, because the queue is still there for the next one.
 *
 * Conflicts are resolved by whoever syncs last. Push happens before pull, so a
 * write made here is on the server before asking what changed, and the answer
 * already includes it. Two devices editing the same entity offline is the one
 * case where an edit is silently overwritten — acceptable for one person with
 * a phone and a browser, and `updated_at` is there if it ever needs detecting.
 */
export function openSyncedStorage(
  local: LocalStorage,
  remote: RemoteStorage,
  options: SyncedOptions = {},
): PlannerStorage {
  /** One sync at a time: two drains would push the same entries twice. */
  let corriendo: Promise<void> | null = null

  function sincronizarPronto(): void {
    void sincronizar()
  }

  async function sincronizar(): Promise<void> {
    corriendo ??= ejecutar().finally(() => {
      corriendo = null
    })
    return corriendo
  }

  async function ejecutar(): Promise<void> {
    try {
      if ((await local.leerMeta(ULTIMO_PULL)) === null) await sembrar()
      await empujar()
      await traer()
    } catch (error) {
      // Offline is the normal case, not a bug: the queue survives and the next
      // write — or the next launch — tries again.
      console.warn('[plannermi] sync postponed', error)
      options.alFallar?.(error)
    }
  }

  /**
   * The first sync after signing in, which is the one that would otherwise
   * lose data: everything already on the phone was written with the outbox
   * off, so nothing describes it and nothing would push it.
   *
   * Sent as plain puts, so this is a union and not a takeover — ids are random
   * enough never to collide, so a base already filled from another device
   * keeps everything it had and gains what this phone brought.
   */
  async function sembrar(): Promise<void> {
    for (const fila of datasetToRows(await local.load())) {
      await remote.put(fila.kind, fila.data as never)
    }
  }

  async function empujar(): Promise<void> {
    const pendientes = colapsarOutbox(await local.pendientes())
    if (pendientes.length === 0) return

    for (const entrada of pendientes) {
      await aplicarOp(remote, entrada.op)
    }
    // Acked together, and only after every one of them landed: a half-drained
    // queue that forgot the rest would lose those writes for good.
    await local.confirmar(pendientes.map((e) => e.seq))
  }

  async function traer(): Promise<void> {
    const desde = await local.leerMeta(ULTIMO_PULL)
    const cambios = await remote.cambiosDesde(desde)

    if (cambios.registros.length > 0 || cambios.borrados.length > 0) {
      await local.aplicarRemoto(cambios)
      options.alCambiar?.()
    }

    await local.guardarMeta(ULTIMO_PULL, cambios.hasta)
  }

  // Two moments worth syncing at, besides after a write: opening the app, and
  // coming back to it. Between them they cover "I edited this on the laptop and
  // then picked up the phone", which is the whole point of syncing at all.
  sincronizarPronto()
  const suscripcion = AppState.addEventListener('change', (estado) => {
    if (estado === 'active') sincronizarPronto()
  })

  return {
    load: () => local.load(),

    async put(store, value) {
      await local.put(store, value)
      sincronizarPronto()
    },

    async remove(store, id) {
      await local.remove(store, id)
      sincronizarPronto()
    },

    async applyDeletePlan(plan, bloques) {
      await local.applyDeletePlan(plan, bloques)
      sincronizarPronto()
    },

    async replaceDataset(dataset) {
      await local.replaceDataset(dataset)
      sincronizarPronto()
    },

    // Signing out builds a new storage; without this the old one would keep
    // listening and keep syncing to an account nobody is using any more.
    cerrar: () => suscripcion.remove(),
  }
}
