import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChipGroup } from '../components/ChipGroup'
import { ColorPicker } from '../components/ColorPicker'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { formatFechaCorta, formatFechaEditable, parseFechaCorta } from '../lib/dateInput'
import { usePlannerStore } from '../store/usePlannerStore'
import { evaluacionesDeRamo, ramoById, tareasDeEvaluacion } from '../store/selectors'
import type { DeletePlan } from '../logic/cascade'
import {
  IMPORTANCIAS,
  TIPOS_EVALUACION,
  type Evaluacion,
  type Importancia,
  type Ramo,
  type TipoEvaluacion,
} from '../model/types'

const TIPO_LABEL: Record<TipoEvaluacion, string> = {
  prueba: 'Prueba',
  control: 'Control',
  entrega: 'Entrega',
  examen: 'Examen',
}

const IMPORTANCIA_LABEL: Record<Importancia, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

export function CourseDetailPage() {
  const { id = '' } = useParams()
  const data = usePlannerStore((s) => s.data)
  const ramo = ramoById(data, id)

  if (!ramo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-body text-ink-secondary">Ese ramo ya no existe.</p>
        <Link to="/ramos" className="text-body underline">
          Volver a Ramos
        </Link>
      </div>
    )
  }

  return <DetalleRamo ramo={ramo} />
}

function DetalleRamo({ ramo }: { ramo: Ramo }) {
  const data = usePlannerStore((s) => s.data)
  const updateRamo = usePlannerStore((s) => s.updateRamo)
  const deleteRamo = usePlannerStore((s) => s.deleteRamo)
  const planDeleteRamo = usePlannerStore((s) => s.planDeleteRamo)
  const navigate = useNavigate()

  const [confirmando, setConfirmando] = useState(false)
  const evaluaciones = evaluacionesDeRamo(data, ramo.id)

  async function eliminar() {
    setConfirmando(false)
    const ok = await deleteRamo(ramo.id)
    if (ok) void navigate('/ramos')
  }

  return (
    <div className="h-full overflow-y-auto px-4 pb-10">
      <Link to="/ramos" className="flex min-h-[44px] items-center text-meta text-ink-secondary">
        ← Ramos
      </Link>

      <CampoTexto
        value={ramo.nombre}
        onSave={(nombre) => void updateRamo(ramo.id, { nombre })}
        className="w-full text-title font-bold outline-none"
        aria-label="Nombre del ramo"
      />
      <CampoTexto
        value={ramo.sigla ?? ''}
        placeholder="Sigla"
        onSave={(sigla) => void updateRamo(ramo.id, { sigla: sigla || undefined })}
        className="w-full text-meta text-ink-secondary outline-none placeholder:text-ink-tertiary"
        aria-label="Sigla del ramo"
      />

      <div className="mt-2">
        <ColorPicker
          value={ramo.color}
          onChange={(color) => void updateRamo(ramo.id, { color })}
        />
      </div>

      <ul className="mt-4">
        {evaluaciones.map((evaluacion) => (
          <EvaluacionRow key={evaluacion.id} evaluacion={evaluacion} />
        ))}
      </ul>

      <NuevaEvaluacionRow ramoId={ramo.id} autoFocus={evaluaciones.length === 0} />

      <div className="mt-10 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => void updateRamo(ramo.id, { archivado: !ramo.archivado })}
          className="flex min-h-[44px] items-center text-body"
        >
          {ramo.archivado ? 'Desarchivar ramo' : 'Archivar ramo'}
        </button>
        <p className="text-meta text-ink-secondary">
          Un ramo archivado desaparece del mes y del día, pero conserva sus datos.
        </p>

        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="mt-4 flex min-h-[44px] items-center text-body text-importance"
        >
          Eliminar ramo
        </button>
      </div>

      {confirmando && (
        <ConfirmDialog
          titulo={`¿Eliminar ${ramo.nombre}?`}
          detalle={detalleBorrado(planDeleteRamo(ramo.id))}
          onConfirm={() => void eliminar()}
          onCancel={() => setConfirmando(false)}
        />
      )}
    </div>
  )
}

/** The confirmation carries the concrete numbers, never "esto y lo asociado". */
function detalleBorrado(plan: DeletePlan): string {
  const partes: string[] = []
  const { evaluacionIds, tareaIds, bloquesDesvinculados } = plan
  if (evaluacionIds.length > 0) {
    // "evaluación" loses its accent in the plural: not a suffix job.
    partes.push(
      `${evaluacionIds.length} ${evaluacionIds.length === 1 ? 'evaluación' : 'evaluaciones'}`,
    )
  }
  if (tareaIds.length > 0) {
    partes.push(`${tareaIds.length} tarea${tareaIds.length === 1 ? '' : 's'}`)
  }

  const borrado =
    partes.length === 0
      ? 'No tiene evaluaciones ni tareas.'
      : `Se eliminarán ${partes.join(' y ')}.`

  const bloques = bloquesDesvinculados.length
  if (bloques === 0) return borrado
  return `${borrado} ${bloques === 1 ? 'Un bloque queda' : `${bloques} bloques quedan`} en tu día, sin el vínculo.`
}

/** Collapsed by default: date, title, and the type. Tap to open. */
function EvaluacionRow({ evaluacion }: { evaluacion: Evaluacion }) {
  const [abierta, setAbierta] = useState(false)
  const data = usePlannerStore((s) => s.data)
  const tareas = tareasDeEvaluacion(data, evaluacion.id)
  const pendientes = tareas.filter((t) => !t.hecha).length
  const alta = evaluacion.importancia === 'alta'

  return (
    <li className="border-b border-border-hairline">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="flex min-h-[52px] w-full items-center gap-3 text-left"
      >
        <span
          className={`w-24 shrink-0 text-meta ${alta ? 'font-bold text-importance' : 'text-ink-secondary'}`}
        >
          {formatFechaCorta(evaluacion.fecha)}
        </span>
        <span className="min-w-0 flex-1 truncate text-body">{evaluacion.titulo}</span>
        {tareas.length > 0 && (
          <span className="shrink-0 text-meta text-ink-tertiary">
            {pendientes}/{tareas.length}
          </span>
        )}
        <span className="shrink-0 text-meta text-ink-tertiary">
          {TIPO_LABEL[evaluacion.tipo]}
        </span>
      </button>

      {abierta && <EvaluacionEditor evaluacion={evaluacion} />}
    </li>
  )
}

/** Everything the quick row left out, edited a tap at a time. */
function EvaluacionEditor({ evaluacion }: { evaluacion: Evaluacion }) {
  const updateEvaluacion = usePlannerStore((s) => s.updateEvaluacion)
  const deleteEvaluacion = usePlannerStore((s) => s.deleteEvaluacion)
  const planDeleteEvaluacion = usePlannerStore((s) => s.planDeleteEvaluacion)
  const [confirmando, setConfirmando] = useState(false)

  return (
    <div className="pb-4 pl-24">
      <div className="flex flex-col gap-3">
        <ChipGroup
          label="Tipo"
          value={evaluacion.tipo}
          options={TIPOS_EVALUACION}
          labels={TIPO_LABEL}
          onChange={(tipo) => void updateEvaluacion(evaluacion.id, { tipo })}
        />
        <ChipGroup
          label="Importancia"
          value={evaluacion.importancia}
          options={IMPORTANCIAS}
          labels={IMPORTANCIA_LABEL}
          onChange={(importancia) => void updateEvaluacion(evaluacion.id, { importancia })}
        />
        <CampoTexto
          value={evaluacion.descripcion ?? ''}
          placeholder="Descripción"
          onSave={(descripcion) =>
            void updateEvaluacion(evaluacion.id, { descripcion: descripcion || undefined })
          }
          className="min-h-[44px] w-full text-body outline-none placeholder:text-ink-tertiary"
          aria-label="Descripción"
        />
        <CampoFecha
          value={evaluacion.fecha}
          onSave={(fecha) => void updateEvaluacion(evaluacion.id, { fecha })}
        />
      </div>

      <TareasDeEvaluacion evaluacionId={evaluacion.id} />

      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="mt-2 flex min-h-[44px] items-center text-meta text-importance"
      >
        Eliminar evaluación
      </button>

      {confirmando && (
        <ConfirmDialog
          titulo={`¿Eliminar ${evaluacion.titulo}?`}
          detalle={detalleBorrado(planDeleteEvaluacion(evaluacion.id))}
          onConfirm={() => {
            setConfirmando(false)
            void deleteEvaluacion(evaluacion.id)
          }}
          onCancel={() => setConfirmando(false)}
        />
      )}
    </div>
  )
}

function TareasDeEvaluacion({ evaluacionId }: { evaluacionId: string }) {
  const data = usePlannerStore((s) => s.data)
  const createTarea = usePlannerStore((s) => s.createTarea)
  const updateTarea = usePlannerStore((s) => s.updateTarea)
  const deleteTarea = usePlannerStore((s) => s.deleteTarea)
  const [titulo, setTitulo] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const tareas = tareasDeEvaluacion(data, evaluacionId)

  async function guardar() {
    const limpio = titulo.trim()
    if (limpio === '') return
    // Cleared before the write, so fast typing cannot pile the next task
    // on top of this one.
    setTitulo('')
    inputRef.current?.focus()

    const creada = await createTarea({ titulo: limpio, evaluacionId, hecha: false })
    if (!creada) setTitulo(limpio)
  }

  return (
    <ul className="mt-2">
      {tareas.map((tarea) => (
        <li key={tarea.id} className="flex items-center gap-2">
          <label className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2">
            <input
              type="checkbox"
              checked={tarea.hecha}
              onChange={(e) => void updateTarea(tarea.id, { hecha: e.target.checked })}
              className="h-4 w-4 accent-[var(--pm-text)]"
            />
            <span
              className={`truncate text-body ${tarea.hecha ? 'text-ink-tertiary line-through' : ''}`}
            >
              {tarea.titulo}
            </span>
          </label>
          <button
            type="button"
            onClick={() => void deleteTarea(tarea.id)}
            aria-label={`Eliminar tarea ${tarea.titulo}`}
            className="h-11 w-11 shrink-0 text-meta text-ink-tertiary"
          >
            ✕
          </button>
        </li>
      ))}
      <li>
        <input
          ref={inputRef}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void guardar()
          }}
          onBlur={() => void guardar()}
          placeholder="Nueva tarea"
          aria-label="Nueva tarea"
          className="min-h-[44px] w-full bg-transparent text-body outline-none placeholder:text-ink-tertiary"
        />
      </li>
    </ul>
  )
}

/**
 * The row that makes loading a semester fast: title, date, Enter, next.
 * Enter on the title jumps to the date; Enter on the date saves and comes
 * back to the title, so a whole semester is one uninterrupted run.
 */
function NuevaEvaluacionRow({ ramoId, autoFocus }: { ramoId: string; autoFocus: boolean }) {
  const createEvaluacion = usePlannerStore((s) => s.createEvaluacion)
  const [titulo, setTitulo] = useState('')
  const [fechaTexto, setFechaTexto] = useState('')
  const [error, setError] = useState(false)
  const tituloRef = useRef<HTMLInputElement>(null)
  const fechaRef = useRef<HTMLInputElement>(null)
  /**
   * Enter saves and moves focus, which fires the date field's blur in the
   * same tick — before React has re-rendered with the cleared state. The ref
   * is emptied synchronously, so that second call finds nothing to save.
   */
  const pendiente = useRef({ titulo: '', fechaTexto: '' })

  async function guardar() {
    const limpio = pendiente.current.titulo.trim()
    const textoFecha = pendiente.current.fechaTexto
    const fecha = parseFechaCorta(textoFecha)
    if (limpio === '' || fecha === null) {
      setError(textoFecha.trim() !== '' && fecha === null)
      return
    }

    pendiente.current = { titulo: '', fechaTexto: '' }
    setTitulo('')
    setFechaTexto('')
    setError(false)
    tituloRef.current?.focus()

    const creada = await createEvaluacion({
      ramoId,
      titulo: limpio,
      fecha,
      tipo: 'prueba',
      importancia: 'media',
    })
    if (!creada) {
      pendiente.current = { titulo: limpio, fechaTexto: textoFecha }
      setTitulo(limpio)
      setFechaTexto(textoFecha)
    }
  }

  return (
    <div className="flex items-center gap-3 border-b border-border-hairline">
      <input
        ref={tituloRef}
        value={titulo}
        autoFocus={autoFocus}
        onChange={(e) => {
          pendiente.current.titulo = e.target.value
          setTitulo(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') fechaRef.current?.focus()
        }}
        placeholder="Nueva evaluación"
        aria-label="Título de la nueva evaluación"
        className="min-h-[52px] min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-ink-tertiary"
      />
      <input
        ref={fechaRef}
        value={fechaTexto}
        inputMode="numeric"
        onChange={(e) => {
          pendiente.current.fechaTexto = e.target.value
          setFechaTexto(e.target.value)
          setError(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void guardar()
        }}
        onBlur={() => void guardar()}
        placeholder="12/9"
        aria-label="Fecha de la nueva evaluación"
        className={`min-h-[52px] w-20 bg-transparent text-right text-body outline-none placeholder:text-ink-tertiary ${
          error ? 'text-importance' : ''
        }`}
      />
    </div>
  )
}

/** Edit in place: saves on blur and on Enter, reverts on Escape. */
function CampoTexto({
  value,
  onSave,
  className,
  placeholder,
  'aria-label': ariaLabel,
}: {
  value: string
  onSave: (value: string) => void
  className: string
  placeholder?: string
  'aria-label': string
}) {
  const [texto, setTexto] = useState(value)
  const [editando, setEditando] = useState(false)

  // While not editing, follow the store (another screen may have changed it).
  const mostrado = editando ? texto : value

  return (
    <input
      value={mostrado}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={className}
      onFocus={() => {
        setTexto(value)
        setEditando(true)
      }}
      onChange={(e) => setTexto(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setTexto(value)
          setEditando(false)
          e.currentTarget.blur()
        }
      }}
      onBlur={() => {
        setEditando(false)
        const limpio = texto.trim()
        if (limpio !== value) onSave(limpio)
      }}
    />
  )
}

/** Same idea, parsing "12/9" and refusing to save what it cannot read. */
function CampoFecha({ value, onSave }: { value: string; onSave: (fecha: string) => void }) {
  const [texto, setTexto] = useState(() => formatFechaEditable(value))
  const [editando, setEditando] = useState(false)
  const [error, setError] = useState(false)

  return (
    <input
      value={editando ? texto : formatFechaEditable(value)}
      inputMode="numeric"
      aria-label="Fecha"
      className={`min-h-[44px] w-24 bg-transparent text-body outline-none ${
        error ? 'text-importance' : ''
      }`}
      onFocus={() => {
        setTexto(formatFechaEditable(value))
        setEditando(true)
      }}
      onChange={(e) => {
        setTexto(e.target.value)
        setError(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      onBlur={() => {
        setEditando(false)
        const fecha = parseFechaCorta(texto)
        if (fecha === null) {
          setError(true)
          return
        }
        if (fecha !== value) onSave(fecha)
      }}
    />
  )
}
