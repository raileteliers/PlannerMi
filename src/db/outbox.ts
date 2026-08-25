import type { DeletePlan } from '../logic/cascade'
import type { BloqueTiempo, Dataset } from '../model/types'
import type { PlannerStorage, StoreName } from './storage'

/**
 * A write that happened locally and has not reached the server yet.
 *
 * One variant per method of PlannerStorage, so draining the queue is replaying
 * the same calls against the remote — no second implementation of what a write
 * means.
 */
export type OutboxOp =
  | { op: 'put'; kind: StoreName; value: { id: string } }
  | { op: 'remove'; kind: StoreName; id: string }
  | { op: 'plan'; plan: DeletePlan; bloques: BloqueTiempo[] }
  | { op: 'replace'; dataset: Dataset }

export interface OutboxEntry {
  /** SQLite's rowid: the order the writes happened in, and the ack key. */
  seq: number
  op: OutboxOp
}

/**
 * Drops the entries that a later one already makes irrelevant.
 *
 * Worth doing because a phone offline for a week accumulates every keystroke's
 * worth of edits, and pushing five hundred writes of the same tarea is five
 * hundred requests to arrive at the state the last one describes.
 *
 * Two rules, both safe because they leave the final state identical:
 *  - everything before a `replace` is gone anyway, since replace wipes first;
 *  - a `put` whose key is touched again later does not decide that key.
 *
 * `remove` and `plan` are never dropped: they leave tombstones, and a tombstone
 * that never arrives is a record that comes back from the dead on the next pull.
 */
export function colapsarOutbox(entries: OutboxEntry[]): OutboxEntry[] {
  const desdeReplace = entries.findLastIndex((e) => e.op.op === 'replace')
  const vigentes = desdeReplace === -1 ? entries : entries.slice(desdeReplace)

  return vigentes.filter((entry, i) => {
    if (entry.op.op !== 'put') return true
    const clave = `${entry.op.kind}:${entry.op.value.id}`
    return !vigentes.slice(i + 1).some((posterior) => toca(posterior.op, clave))
  })
}

/** Whether an operation decides the final state of one `kind:id`. */
function toca(op: OutboxOp, clave: string): boolean {
  switch (op.op) {
    case 'put':
      return `${op.kind}:${op.value.id}` === clave
    case 'remove':
      return `${op.kind}:${op.id}` === clave
    case 'plan':
      return [
        ...op.plan.ramoIds.map((id) => `ramos:${id}`),
        ...op.plan.evaluacionIds.map((id) => `evaluaciones:${id}`),
        ...op.plan.compromisoIds.map((id) => `compromisos:${id}`),
        ...op.plan.tareaIds.map((id) => `tareas:${id}`),
        ...op.bloques.map((b) => `bloques:${b.id}`),
      ].includes(clave)
    case 'replace':
      return true
  }
}

/** Replays one queued write against the server. */
export function aplicarOp(storage: PlannerStorage, op: OutboxOp): Promise<void> {
  switch (op.op) {
    case 'put':
      return storage.put(op.kind, op.value as never)
    case 'remove':
      return storage.remove(op.kind, op.id)
    case 'plan':
      return storage.applyDeletePlan(op.plan, op.bloques)
    case 'replace':
      return storage.replaceDataset(op.dataset)
  }
}
