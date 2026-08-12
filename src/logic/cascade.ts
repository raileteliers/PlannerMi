import type { BloqueTiempo, Dataset, RefTipo } from '../model/types'

/**
 * What a delete would touch. The UI shows these numbers in the confirmation
 * ("Se eliminarán 3 evaluaciones y 7 tareas") before anything happens.
 */
export interface DeletePlan {
  ramoIds: string[]
  evaluacionIds: string[]
  tareaIds: string[]
  compromisoIds: string[]
  /** Blocks that survive with their `ref` cleared. That time was used anyway. */
  bloquesDesvinculados: BloqueTiempo[]
}

export interface DeleteResult {
  dataset: Dataset
  plan: DeletePlan
}

const emptyPlan = (): DeletePlan => ({
  ramoIds: [],
  evaluacionIds: [],
  tareaIds: [],
  compromisoIds: [],
  bloquesDesvinculados: [],
})

/** Ramo -> its evaluaciones -> their tareas. Blocks survive, unlinked. */
export function planDeleteRamo(dataset: Dataset, ramoId: string): DeletePlan {
  const evaluacionIds = dataset.evaluaciones
    .filter((e) => e.ramoId === ramoId)
    .map((e) => e.id)
  const tareaIds = dataset.tareas
    .filter((t) => t.evaluacionId !== undefined && evaluacionIds.includes(t.evaluacionId))
    .map((t) => t.id)

  return {
    ...emptyPlan(),
    ramoIds: [ramoId],
    evaluacionIds,
    tareaIds,
    bloquesDesvinculados: bloquesApuntandoA(dataset, [
      ...evaluacionIds.map((id) => ref('evaluacion', id)),
      ...tareaIds.map((id) => ref('tarea', id)),
    ]),
  }
}

/** Evaluacion -> its tareas. */
export function planDeleteEvaluacion(dataset: Dataset, evaluacionId: string): DeletePlan {
  const tareaIds = dataset.tareas
    .filter((t) => t.evaluacionId === evaluacionId)
    .map((t) => t.id)

  return {
    ...emptyPlan(),
    evaluacionIds: [evaluacionId],
    tareaIds,
    bloquesDesvinculados: bloquesApuntandoA(dataset, [
      ref('evaluacion', evaluacionId),
      ...tareaIds.map((id) => ref('tarea', id)),
    ]),
  }
}

/** Compromiso hangs off nothing, so it takes nothing with it. */
export function planDeleteCompromiso(dataset: Dataset, compromisoId: string): DeletePlan {
  return {
    ...emptyPlan(),
    compromisoIds: [compromisoId],
    bloquesDesvinculados: bloquesApuntandoA(dataset, [ref('compromiso', compromisoId)]),
  }
}

export function planDeleteTarea(dataset: Dataset, tareaId: string): DeletePlan {
  return {
    ...emptyPlan(),
    tareaIds: [tareaId],
    bloquesDesvinculados: bloquesApuntandoA(dataset, [ref('tarea', tareaId)]),
  }
}

/** Apply a plan: remove the entities, keep the blocks and strip their refs. */
export function applyDeletePlan(dataset: Dataset, plan: DeletePlan): Dataset {
  const ramos = new Set(plan.ramoIds)
  const evaluaciones = new Set(plan.evaluacionIds)
  const tareas = new Set(plan.tareaIds)
  const compromisos = new Set(plan.compromisoIds)
  const desvincular = new Set(plan.bloquesDesvinculados.map((b) => b.id))

  return {
    ramos: dataset.ramos.filter((r) => !ramos.has(r.id)),
    evaluaciones: dataset.evaluaciones.filter((e) => !evaluaciones.has(e.id)),
    compromisos: dataset.compromisos.filter((c) => !compromisos.has(c.id)),
    tareas: dataset.tareas.filter((t) => !tareas.has(t.id)),
    bloques: dataset.bloques.map((b) =>
      desvincular.has(b.id) ? stripRef(b) : b,
    ),
  }
}

export const deleteRamo = (dataset: Dataset, id: string): DeleteResult =>
  run(dataset, planDeleteRamo(dataset, id))
export const deleteEvaluacion = (dataset: Dataset, id: string): DeleteResult =>
  run(dataset, planDeleteEvaluacion(dataset, id))
export const deleteCompromiso = (dataset: Dataset, id: string): DeleteResult =>
  run(dataset, planDeleteCompromiso(dataset, id))
export const deleteTarea = (dataset: Dataset, id: string): DeleteResult =>
  run(dataset, planDeleteTarea(dataset, id))

const run = (dataset: Dataset, plan: DeletePlan): DeleteResult => ({
  dataset: applyDeletePlan(dataset, plan),
  plan,
})

const ref = (tipo: RefTipo, id: string) => `${tipo}:${id}`

const bloquesApuntandoA = (dataset: Dataset, refs: string[]): BloqueTiempo[] => {
  const targets = new Set(refs)
  return dataset.bloques.filter(
    (b) => b.ref !== undefined && targets.has(ref(b.ref.tipo, b.ref.id)),
  )
}

/** Drop the key entirely rather than setting it to undefined: it is optional,
 *  and IndexedDB should not store a dangling `ref: undefined`. */
function stripRef(bloque: BloqueTiempo): BloqueTiempo {
  const { ref: _discarded, ...rest } = bloque
  return rest
}
