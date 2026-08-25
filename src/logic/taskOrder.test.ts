import { describe, expect, it } from 'vitest'
import { indiceDestino, ordenadas, reordenar } from './taskOrder'
import type { Tarea } from '../model/types'

const t = (id: string, titulo: string, extra: Partial<Tarea> = {}): Tarea => ({
  id,
  titulo,
  hecha: false,
  ...extra,
})

describe('compararTareas', () => {
  it('sinks the done ones', () => {
    const lista = [t('A', 'Alfa', { hecha: true, orden: 0 }), t('B', 'Beta', { orden: 5 })]
    expect(ordenadas(lista).map((x) => x.id)).toEqual(['B', 'A'])
  })

  it('respects where you dragged them', () => {
    const lista = [t('A', 'Alfa', { orden: 2 }), t('B', 'Beta', { orden: 0 })]
    expect(ordenadas(lista).map((x) => x.id)).toEqual(['B', 'A'])
  })

  it('puts every placed task above every unplaced one', () => {
    const lista = [t('A', 'Alfa'), t('B', 'Beta', { orden: 9 })]
    expect(ordenadas(lista).map((x) => x.id)).toEqual(['B', 'A'])
  })

  it('falls back to the title, and does not scramble two unplaced ones', () => {
    const lista = [t('C', 'Zeta'), t('A', 'Alfa'), t('B', 'Beta')]
    expect(ordenadas(lista).map((x) => x.titulo)).toEqual(['Alfa', 'Beta', 'Zeta'])
  })

  it('sorts by title in Spanish, so accents land where a person expects', () => {
    const lista = [t('A', 'Zapato'), t('B', 'Ánimo')]
    expect(ordenadas(lista).map((x) => x.titulo)).toEqual(['Ánimo', 'Zapato'])
  })
})

describe('reordenar', () => {
  const lista = [t('A', 'Alfa'), t('B', 'Beta'), t('C', 'Cesar')]

  it('numbers the list the way it ends up looking', () => {
    // A B C  ->  move C to the front  ->  C A B
    expect(reordenar(lista, 2, 0)).toEqual([
      { id: 'C', orden: 0 },
      { id: 'A', orden: 1 },
      { id: 'B', orden: 2 },
    ])
  })

  it('writes only what changed', () => {
    // A B C -> swap the last two -> A C B; A keeps orden 0, which it already had
    const yaNumeradas = [
      t('A', 'Alfa', { orden: 0 }),
      t('B', 'Beta', { orden: 1 }),
      t('C', 'Cesar', { orden: 2 }),
    ]
    expect(reordenar(yaNumeradas, 1, 2)).toEqual([
      { id: 'C', orden: 1 },
      { id: 'B', orden: 2 },
    ])
  })

  it('does nothing when the task is dropped where it started', () => {
    expect(reordenar(lista, 1, 1)).toEqual([])
  })

  it('refuses an index outside the list instead of inventing a position', () => {
    expect(reordenar(lista, 0, 3)).toEqual([])
    expect(reordenar(lista, -1, 0)).toEqual([])
    expect(reordenar(lista, 5, 0)).toEqual([])
  })

  it('handles an empty list', () => {
    expect(reordenar([], 0, 0)).toEqual([])
  })

  it('leaves the input untouched', () => {
    const original = [...lista]
    reordenar(lista, 2, 0)
    expect(lista).toEqual(original)
  })
})

describe('indiceDestino', () => {
  it('turns a drop into the row it landed on', () => {
    expect(indiceDestino(0, 72, 36, 5)).toBe(2)
    expect(indiceDestino(3, -72, 36, 5)).toBe(1)
  })

  it('snaps to the nearest row, not the one being crossed', () => {
    expect(indiceDestino(0, 17, 36, 5)).toBe(0) // less than half a row
    expect(indiceDestino(0, 19, 36, 5)).toBe(1) // more than half
  })

  it('cannot be dragged out of the list', () => {
    expect(indiceDestino(0, -500, 36, 5)).toBe(0)
    expect(indiceDestino(0, 500, 36, 5)).toBe(4)
  })

  it('refuses to divide by a row height of zero', () => {
    expect(indiceDestino(2, 100, 0, 5)).toBe(2)
  })
})
