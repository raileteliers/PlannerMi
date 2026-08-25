import { COURSE_COLORS, CATEGORY_LABEL } from '../design/palette'
import {
  IMPORTANCIAS,
  TIPOS_EVALUACION,
  type BloqueTiempo,
  type Compromiso,
  type Dataset,
  type Evaluacion,
  type Ramo,
  type Recurrencia,
  type RefTipo,
  type Tarea,
} from '../model/types'

export const EXPORT_APP = 'plannermi'
export const EXPORT_VERSION = 1

export interface ExportFile {
  app: typeof EXPORT_APP
  version: number
  exportadoEl: string
  datos: Dataset
}

export type ImportResult =
  | { ok: true; datos: Dataset; avisos: string[] }
  | { ok: false; errores: string[] }

export function buildExport(dataset: Dataset): ExportFile {
  return {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exportadoEl: new Date().toISOString(),
    datos: dataset,
  }
}

/**
 * Validate an import candidate end to end. Nothing here touches the database:
 * the caller only writes when `ok` is true, so a bad file leaves the base
 * exactly as it was.
 *
 * Errors reject the file. Avisos are repairs applied to the returned data
 * (only ever the same repair a delete would have done: clearing a dangling
 * block ref) — the block itself is never dropped.
 */
export function validateImport(raw: unknown): ImportResult {
  const errores: string[] = []
  const avisos: string[] = []

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, errores: ['El archivo no contiene un objeto JSON.'] }
  }
  const file = raw as Record<string, unknown>

  if (file.app !== EXPORT_APP) {
    return { ok: false, errores: ['El archivo no es un respaldo de PlannerMi.'] }
  }
  if (file.version !== EXPORT_VERSION) {
    return {
      ok: false,
      errores: [
        `El respaldo es de la versión ${String(file.version)} y esta app lee la ${EXPORT_VERSION}.`,
      ],
    }
  }
  if (typeof file.datos !== 'object' || file.datos === null) {
    return { ok: false, errores: ['El respaldo no trae datos.'] }
  }

  const datos = file.datos as Record<string, unknown>
  const ramos = readArray(datos.ramos, 'ramos', errores)
  const evaluaciones = readArray(datos.evaluaciones, 'evaluaciones', errores)
  const compromisos = readArray(datos.compromisos, 'compromisos', errores)
  const tareas = readArray(datos.tareas, 'tareas', errores)
  const bloques = readArray(datos.bloques, 'bloques', errores)
  if (errores.length > 0) return { ok: false, errores }

  const parsedRamos = ramos.map((r, i) => parseRamo(r, i, errores))
  const parsedEvaluaciones = evaluaciones.map((e, i) => parseEvaluacion(e, i, errores))
  const parsedCompromisos = compromisos.map((c, i) => parseCompromiso(c, i, errores))
  const parsedTareas = tareas.map((t, i) => parseTarea(t, i, errores))
  const parsedBloques = bloques.map((b, i) => parseBloque(b, i, errores))
  if (errores.length > 0) return { ok: false, errores: dedupe(errores) }

  const clean: Dataset = {
    ramos: parsedRamos as Ramo[],
    evaluaciones: parsedEvaluaciones as Evaluacion[],
    compromisos: parsedCompromisos as Compromiso[],
    tareas: parsedTareas as Tarea[],
    bloques: parsedBloques as BloqueTiempo[],
  }

  checkUniqueIds(clean, errores)
  checkReferences(clean, errores)
  if (errores.length > 0) return { ok: false, errores: dedupe(errores) }

  return { ok: true, datos: repairBlockRefs(clean, avisos), avisos }
}

/** Convenience wrapper for a file picked from disk. */
export function validateImportText(text: string): ImportResult {
  try {
    return validateImport(JSON.parse(text))
  } catch {
    return { ok: false, errores: ['El archivo no es JSON válido.'] }
  }
}

// --- entity parsers ---------------------------------------------------------

function parseRamo(raw: unknown, i: number, errores: string[]): Ramo | null {
  const o = asObject(raw, `ramos[${i}]`, errores)
  if (!o) return null
  const where = `ramos[${i}]`
  return {
    id: reqId(o.id, where, errores),
    nombre: reqText(o.nombre, `${where}.nombre`, errores),
    ...(o.sigla === undefined ? {} : { sigla: reqText(o.sigla, `${where}.sigla`, errores) }),
    color: reqEnum(o.color, COURSE_COLORS, `${where}.color`, errores),
    archivado: reqBool(o.archivado, `${where}.archivado`, errores),
  }
}

function parseEvaluacion(raw: unknown, i: number, errores: string[]): Evaluacion | null {
  const o = asObject(raw, `evaluaciones[${i}]`, errores)
  if (!o) return null
  const where = `evaluaciones[${i}]`
  return {
    id: reqId(o.id, where, errores),
    ramoId: reqId(o.ramoId, `${where}.ramoId`, errores),
    titulo: reqText(o.titulo, `${where}.titulo`, errores),
    fecha: reqDate(o.fecha, `${where}.fecha`, errores),
    tipo: reqEnum(o.tipo, TIPOS_EVALUACION, `${where}.tipo`, errores),
    importancia: reqEnum(o.importancia, IMPORTANCIAS, `${where}.importancia`, errores),
    ...(o.descripcion === undefined
      ? {}
      : { descripcion: reqText(o.descripcion, `${where}.descripcion`, errores) }),
  }
}

function parseCompromiso(raw: unknown, i: number, errores: string[]): Compromiso | null {
  const o = asObject(raw, `compromisos[${i}]`, errores)
  if (!o) return null
  const where = `compromisos[${i}]`
  const categorias = Object.keys(CATEGORY_LABEL) as Compromiso['categoria'][]
  return {
    id: reqId(o.id, where, errores),
    titulo: reqText(o.titulo, `${where}.titulo`, errores),
    fecha: reqDate(o.fecha, `${where}.fecha`, errores),
    ...(o.hora === undefined ? {} : { hora: reqTime(o.hora, `${where}.hora`, errores) }),
    ...(o.duracionMin === undefined
      ? {}
      : { duracionMin: reqNumber(o.duracionMin, `${where}.duracionMin`, errores) }),
    categoria: reqEnum(o.categoria, categorias, `${where}.categoria`, errores),
    importancia: reqEnum(o.importancia, IMPORTANCIAS, `${where}.importancia`, errores),
    ...(o.recurrencia === undefined || o.recurrencia === null
      ? {}
      : { recurrencia: parseRecurrencia(o.recurrencia, where, errores) }),
    ...(o.recordatorioMin === undefined
      ? {}
      : { recordatorioMin: reqNumber(o.recordatorioMin, `${where}.recordatorioMin`, errores) }),
  }
}

function parseRecurrencia(raw: unknown, where: string, errores: string[]): Recurrencia {
  const o = asObject(raw, `${where}.recurrencia`, errores) ?? {}
  const frecuencias: Recurrencia['frecuencia'][] = ['diaria', 'semanal', 'mensual']
  const intervalo = reqNumber(o.intervalo, `${where}.recurrencia.intervalo`, errores)
  if (intervalo < 1) errores.push(`${where}.recurrencia.intervalo debe ser 1 o más.`)

  const diasSemana = o.diasSemana
  if (diasSemana !== undefined) {
    if (
      !Array.isArray(diasSemana) ||
      diasSemana.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
    ) {
      errores.push(`${where}.recurrencia.diasSemana debe ser una lista de números 0 a 6.`)
    }
  }

  const excepciones = o.excepciones
  if (!Array.isArray(excepciones)) {
    errores.push(`${where}.recurrencia.excepciones debe ser una lista de fechas.`)
  } else {
    excepciones.forEach((e, i) =>
      reqDate(e, `${where}.recurrencia.excepciones[${i}]`, errores),
    )
  }

  return {
    frecuencia: reqEnum(o.frecuencia, frecuencias, `${where}.recurrencia.frecuencia`, errores),
    intervalo,
    ...(Array.isArray(diasSemana) ? { diasSemana: diasSemana as number[] } : {}),
    ...(o.hasta === undefined
      ? {}
      : { hasta: reqDate(o.hasta, `${where}.recurrencia.hasta`, errores) }),
    excepciones: Array.isArray(excepciones) ? (excepciones as string[]) : [],
  }
}

function parseTarea(raw: unknown, i: number, errores: string[]): Tarea | null {
  const o = asObject(raw, `tareas[${i}]`, errores)
  if (!o) return null
  const where = `tareas[${i}]`
  return {
    id: reqId(o.id, where, errores),
    titulo: reqText(o.titulo, `${where}.titulo`, errores),
    ...(o.evaluacionId === undefined
      ? {}
      : { evaluacionId: reqId(o.evaluacionId, `${where}.evaluacionId`, errores) }),
    ...(o.fecha === undefined ? {} : { fecha: reqDate(o.fecha, `${where}.fecha`, errores) }),
    hecha: reqBool(o.hecha, `${where}.hecha`, errores),
    ...(o.orden === undefined ? {} : { orden: reqNumber(o.orden, `${where}.orden`, errores) }),
  }
}

function parseBloque(raw: unknown, i: number, errores: string[]): BloqueTiempo | null {
  const o = asObject(raw, `bloques[${i}]`, errores)
  if (!o) return null
  const where = `bloques[${i}]`
  const horaInicio = reqTime(o.horaInicio, `${where}.horaInicio`, errores)
  const horaFin = reqTime(o.horaFin, `${where}.horaFin`, errores)
  if (horaInicio && horaFin && horaFin <= horaInicio) {
    errores.push(`${where}: la hora de término debe ser posterior a la de inicio.`)
  }

  let ref: BloqueTiempo['ref']
  if (o.ref !== undefined && o.ref !== null) {
    const r = asObject(o.ref, `${where}.ref`, errores)
    if (r) {
      const tipos: RefTipo[] = ['evaluacion', 'compromiso', 'tarea']
      ref = {
        tipo: reqEnum(r.tipo, tipos, `${where}.ref.tipo`, errores),
        id: reqId(r.id, `${where}.ref`, errores),
      }
    }
  }

  return {
    id: reqId(o.id, where, errores),
    fecha: reqDate(o.fecha, `${where}.fecha`, errores),
    horaInicio,
    horaFin,
    titulo: reqText(o.titulo, `${where}.titulo`, errores),
    ...(ref === undefined ? {} : { ref }),
  }
}

// --- cross-entity checks ----------------------------------------------------

function checkUniqueIds(d: Dataset, errores: string[]): void {
  const check = (name: string, ids: string[]) => {
    const seen = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) errores.push(`Hay dos ${name} con el id "${id}".`)
      seen.add(id)
    }
  }
  check('ramos', d.ramos.map((r) => r.id))
  check('evaluaciones', d.evaluaciones.map((e) => e.id))
  check('compromisos', d.compromisos.map((c) => c.id))
  check('tareas', d.tareas.map((t) => t.id))
  check('bloques', d.bloques.map((b) => b.id))
}

function checkReferences(d: Dataset, errores: string[]): void {
  const ramoIds = new Set(d.ramos.map((r) => r.id))
  const evaluacionIds = new Set(d.evaluaciones.map((e) => e.id))

  for (const e of d.evaluaciones) {
    if (!ramoIds.has(e.ramoId)) {
      errores.push(`La evaluación "${e.titulo}" apunta a un ramo que no está en el archivo.`)
    }
  }
  for (const t of d.tareas) {
    if (t.evaluacionId !== undefined && !evaluacionIds.has(t.evaluacionId)) {
      errores.push(`La tarea "${t.titulo}" apunta a una evaluación que no está en el archivo.`)
    }
  }
}

/**
 * A block whose ref points nowhere keeps the block and loses the ref — the
 * same rule cascade deletion follows. Reported as an aviso, not an error.
 */
function repairBlockRefs(d: Dataset, avisos: string[]): Dataset {
  const known = {
    evaluacion: new Set(d.evaluaciones.map((e) => e.id)),
    compromiso: new Set(d.compromisos.map((c) => c.id)),
    tarea: new Set(d.tareas.map((t) => t.id)),
  }

  let repaired = 0
  const bloques = d.bloques.map((b) => {
    if (b.ref === undefined || known[b.ref.tipo].has(b.ref.id)) return b
    repaired++
    const { ref: _discarded, ...rest } = b
    return rest
  })

  if (repaired > 0) {
    avisos.push(
      repaired === 1
        ? 'Un bloque apuntaba a algo que ya no existe; se importó sin el vínculo.'
        : `${repaired} bloques apuntaban a algo que ya no existe; se importaron sin el vínculo.`,
    )
  }
  return { ...d, bloques }
}

// --- primitives -------------------------------------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function readArray(value: unknown, name: string, errores: string[]): unknown[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    errores.push(`"${name}" debería ser una lista.`)
    return []
  }
  return value
}

function asObject(
  raw: unknown,
  where: string,
  errores: string[],
): Record<string, unknown> | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    errores.push(`${where} no es un objeto.`)
    return null
  }
  return raw as Record<string, unknown>
}

function reqText(value: unknown, where: string, errores: string[]): string {
  if (typeof value !== 'string' || value.trim() === '') {
    errores.push(`${where} debe ser un texto.`)
    return ''
  }
  return value
}

const reqId = (value: unknown, where: string, errores: string[]): string =>
  reqText(value, `${where}.id`, errores)

function reqBool(value: unknown, where: string, errores: string[]): boolean {
  if (typeof value !== 'boolean') {
    errores.push(`${where} debe ser verdadero o falso.`)
    return false
  }
  return value
}

function reqNumber(value: unknown, where: string, errores: string[]): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errores.push(`${where} debe ser un número.`)
    return 0
  }
  return value
}

function reqDate(value: unknown, where: string, errores: string[]): string {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value) || !isRealDate(value)) {
    errores.push(`${where} debe ser una fecha con formato AAAA-MM-DD.`)
    return ''
  }
  return value
}

function reqTime(value: unknown, where: string, errores: string[]): string {
  if (typeof value !== 'string' || !HHMM_RE.test(value)) {
    errores.push(`${where} debe ser una hora con formato HH:MM.`)
    return ''
  }
  return value
}

function reqEnum<T extends string>(
  value: unknown,
  allowed: T[],
  where: string,
  errores: string[],
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    errores.push(`${where} debe ser uno de: ${allowed.join(', ')}.`)
    return allowed[0] as T
  }
  return value as T
}

/** '2026-02-30' matches the regex but is not a day. */
function isRealDate(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  const date = new Date(y, m - 1, d)
  return (
    date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
  )
}

const dedupe = (errores: string[]): string[] => [...new Set(errores)]
