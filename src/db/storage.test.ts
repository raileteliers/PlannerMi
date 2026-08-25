import { describe, expect, it } from 'vitest'
import { openMemoryStorage } from './memory'
import type { PlannerStorage } from './storage'
import { applyDeletePlan, planDeleteRamo } from '../logic/cascade'
import type { Dataset } from '../model/types'

/**
 * The contract every storage owes, run against the in-memory one.
 *
 * Written as a function over a factory on purpose: when the Supabase storage
 * lands, pointing this same suite at a real project is one call, and that is
 * what keeps the two implementations from drifting apart.
 */
function contract(name: string, open: (initial?: Dataset) => Promise<PlannerStorage>) {
  describe(name, () => {
    it('reads back what it was given', async () => {
      const storage = await open()
      await storage.replaceDataset(sample())
      expect(await storage.load()).toEqual(sample())
    })

    it('appends on put and overwrites on put with the same id', async () => {
      const storage = await open()
      await storage.put('ramos', { id: 'r1', nombre: 'Cálculo', color: 'blue', archivado: false })
      await storage.put('ramos', { id: 'r1', nombre: 'Cálculo II', color: 'blue', archivado: false })
      const { ramos } = await storage.load()
      expect(ramos).toEqual([
        { id: 'r1', nombre: 'Cálculo II', color: 'blue', archivado: false },
      ])
    })

    it('removes one record and leaves the rest', async () => {
      const storage = await open(sample())
      await storage.remove('tareas', 't1')
      const { tareas, evaluaciones } = await storage.load()
      expect(tareas).toEqual([])
      expect(evaluaciones).toHaveLength(1)
    })

    it('applies a cascade delete and unlinks the orphaned block', async () => {
      const storage = await open(sample())
      const plan = planDeleteRamo(sample(), 'r1')
      const esperado = applyDeletePlan(sample(), plan)
      const bloquesActualizados = esperado.bloques.filter((b) =>
        plan.bloquesDesvinculados.some((original) => original.id === b.id),
      )

      await storage.applyDeletePlan(plan, bloquesActualizados)

      const data = await storage.load()
      expect(data.ramos).toEqual([])
      expect(data.evaluaciones).toEqual([])
      expect(data.tareas).toEqual([])
      // The block survives; only its ref is gone. That time was used anyway.
      expect(data.bloques).toHaveLength(1)
      expect(data.bloques[0]?.ref).toBeUndefined()
      expect(data.bloques[0]?.titulo).toBe('Estudiar')
    })

    it('replaces the whole dataset, leaving nothing of the old one', async () => {
      const storage = await open(sample())
      const vacio: Dataset = {
        ramos: [], evaluaciones: [], compromisos: [], tareas: [], bloques: [],
      }
      await storage.replaceDataset(vacio)
      expect(await storage.load()).toEqual(vacio)
    })

    it('does not hand out a reference a caller can mutate', async () => {
      const storage = await open(sample())
      const primera = await storage.load()
      primera.ramos.push({ id: 'colado', nombre: 'X', color: 'blue', archivado: false })
      const segunda = await storage.load()
      expect(segunda.ramos).toHaveLength(1)
    })
  })
}

const sample = (): Dataset => ({
  ramos: [{ id: 'r1', nombre: 'Cálculo', color: 'blue', archivado: false }],
  evaluaciones: [
    {
      id: 'e1', ramoId: 'r1', titulo: 'Prueba 1', fecha: '2026-08-24',
      tipo: 'prueba', importancia: 'alta',
    },
  ],
  compromisos: [],
  tareas: [{ id: 't1', titulo: 'Repasar', evaluacionId: 'e1', hecha: false }],
  bloques: [
    {
      id: 'b1', fecha: '2026-08-23', horaInicio: '10:00', horaFin: '11:30',
      titulo: 'Estudiar', ref: { tipo: 'evaluacion', id: 'e1' },
    },
  ],
})

contract('memory storage', (initial) => Promise.resolve(openMemoryStorage(initial)))
