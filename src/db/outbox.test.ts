import { describe, expect, it } from 'vitest'
import { colapsarOutbox, type OutboxEntry, type OutboxOp } from './outbox'
import { emptyDataset } from '../model/types'

const entry = (seq: number, op: OutboxOp): OutboxEntry => ({ seq, op })
const put = (kind: 'ramos' | 'tareas', id: string): OutboxOp =>
  ({ op: 'put', kind, value: { id } })

describe('colapsarOutbox', () => {
  it('leaves a queue with nothing redundant alone', () => {
    const cola = [entry(1, put('ramos', 'r1')), entry(2, put('tareas', 't1'))]
    expect(colapsarOutbox(cola)).toEqual(cola)
  })

  it('keeps only the last put of the same record', () => {
    const cola = [
      entry(1, put('ramos', 'r1')),
      entry(2, put('ramos', 'r1')),
      entry(3, put('ramos', 'r1')),
    ]
    expect(colapsarOutbox(cola).map((e) => e.seq)).toEqual([3])
  })

  it('does not confuse the same id in two different collections', () => {
    const cola = [entry(1, put('ramos', 'x')), entry(2, put('tareas', 'x'))]
    expect(colapsarOutbox(cola).map((e) => e.seq)).toEqual([1, 2])
  })

  it('drops a put that a later remove of the same record supersedes', () => {
    const cola = [
      entry(1, put('ramos', 'r1')),
      entry(2, { op: 'remove', kind: 'ramos', id: 'r1' }),
    ]
    expect(colapsarOutbox(cola).map((e) => e.seq)).toEqual([2])
  })

  it('never drops a remove: the tombstone has to reach the server', () => {
    const cola = [
      entry(1, { op: 'remove', kind: 'ramos', id: 'r1' }),
      entry(2, { op: 'remove', kind: 'ramos', id: 'r1' }),
    ]
    expect(colapsarOutbox(cola).map((e) => e.seq)).toEqual([1, 2])
  })

  it('drops a put that a later cascade delete covers', () => {
    const cola = [
      entry(1, put('tareas', 't1')),
      entry(2, {
        op: 'plan',
        plan: {
          ramoIds: ['r1'], evaluacionIds: ['e1'], tareaIds: ['t1'],
          compromisoIds: [], bloquesDesvinculados: [],
        },
        bloques: [],
      }),
    ]
    expect(colapsarOutbox(cola).map((e) => e.seq)).toEqual([2])
  })

  it('throws away everything before a replace, which wipes first anyway', () => {
    const cola = [
      entry(1, put('ramos', 'r1')),
      entry(2, { op: 'remove', kind: 'tareas', id: 't1' }),
      entry(3, { op: 'replace', dataset: emptyDataset() }),
      entry(4, put('ramos', 'r2')),
    ]
    expect(colapsarOutbox(cola).map((e) => e.seq)).toEqual([3, 4])
  })

  it('keeps only the last of several replaces', () => {
    const cola = [
      entry(1, { op: 'replace', dataset: emptyDataset() }),
      entry(2, { op: 'replace', dataset: emptyDataset() }),
    ]
    expect(colapsarOutbox(cola).map((e) => e.seq)).toEqual([2])
  })

  it('has nothing to do with an empty queue', () => {
    expect(colapsarOutbox([])).toEqual([])
  })
})
