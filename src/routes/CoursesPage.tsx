import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { COURSE_COLORS, courseColorVar, type ColorToken } from '../design/palette'
import { ColorPicker } from '../components/ColorPicker'
import { usePlannerStore } from '../store/usePlannerStore'
import {
  pendientesDeRamo,
  ramosActivos,
  ramosArchivados,
  siguienteColorLibre,
} from '../store/selectors'
import type { Ramo } from '../model/types'

/**
 * The way into the app, and the answer to the risk of it sitting empty.
 * Creating a ramo is one field: type the name, press Enter, the row stays
 * ready for the next one.
 */
export function CoursesPage() {
  const data = usePlannerStore((s) => s.data)
  const activos = ramosActivos(data)
  const archivados = ramosArchivados(data)
  const nombreRef = useRef<HTMLInputElement>(null)
  const [creando, setCreando] = useState(false)

  if (data.ramos.length === 0 && !creando) {
    return <SinRamos onCrear={() => setCreando(true)} />
  }

  // One layout from here on: saving the first ramo must not swap the input
  // out from under the cursor, or the next name is typed into nothing.
  return (
    <div className="h-full overflow-y-auto px-4 pb-8">
      <h1 className="py-3 text-title font-bold">Ramos</h1>

      <ul>
        {activos.map((ramo) => (
          <RamoRow key={ramo.id} ramo={ramo} pendientes={pendientesDeRamo(data, ramo.id)} />
        ))}
      </ul>

      <NuevoRamoRow inputRef={nombreRef} autoFocus={creando} />

      {archivados.length > 0 && (
        <section className="mt-8">
          <h2 className="text-meta text-ink-secondary">Archivados</h2>
          <ul className="mt-1">
            {archivados.map((ramo) => (
              <RamoRow key={ramo.id} ramo={ramo} pendientes={0} archivado />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** The empty screen is the onboarding: one line and one action. */
function SinRamos({ onCrear }: { onCrear: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8">
      <p className="text-body text-ink-secondary">Todavía no tenés ramos.</p>
      <button
        type="button"
        onClick={onCrear}
        className="min-h-[44px] rounded-card bg-accent px-6 text-body text-on-accent"
      >
        Crear el primero
      </button>
    </div>
  )
}

function RamoRow({
  ramo,
  pendientes,
  archivado = false,
}: {
  ramo: Ramo
  pendientes: number
  archivado?: boolean
}) {
  return (
    <li>
      <Link
        to={`/ramos/${ramo.id}`}
        className="flex min-h-[56px] items-center gap-3 border-b border-border-hairline"
      >
        <span
          className="h-6 w-1 shrink-0 rounded-bar"
          style={{
            background: courseColorVar(ramo.color),
            opacity: archivado ? 0.35 : 1,
          }}
        />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-body ${archivado ? 'text-ink-secondary' : ''}`}>
            {ramo.nombre}
          </span>
          {ramo.sigla && (
            <span className="block text-meta text-ink-tertiary">{ramo.sigla}</span>
          )}
        </span>
        {!archivado && (
          <span className="shrink-0 text-meta text-ink-secondary">
            {pendientes === 0
              ? 'sin pendientes'
              : `${pendientes} pendiente${pendientes === 1 ? '' : 's'}`}
          </span>
        )}
      </Link>
    </li>
  )
}

/** Type a name, press Enter, keep typing the next one. */
function NuevoRamoRow({
  inputRef,
  autoFocus = false,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  autoFocus?: boolean
}) {
  const data = usePlannerStore((s) => s.data)
  const createRamo = usePlannerStore((s) => s.createRamo)
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState<ColorToken | null>(null)

  const usados = data.ramos.map((r) => r.color)
  const colorElegido = color ?? siguienteColorLibre(COURSE_COLORS, usados)

  async function guardar() {
    const limpio = nombre.trim()
    if (limpio === '') return

    // Clear before awaiting the write: at typing speed the next name starts
    // arriving while IndexedDB is still busy, and it would land on top of
    // this one.
    setNombre('')
    setColor(null) // the next ramo gets the next free color
    inputRef.current?.focus()

    const creado = await createRamo({ nombre: limpio, color: colorElegido, archivado: false })
    if (!creado) setNombre(limpio)
  }

  return (
    <div className="flex min-h-[56px] items-center gap-3 border-b border-border-hairline">
      <ColorPicker value={colorElegido} onChange={setColor} />
      <input
        ref={inputRef}
        value={nombre}
        autoFocus={autoFocus}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void guardar()
        }}
        onBlur={(e) => {
          // Picking a color blurs the field without meaning "save it now".
          if (e.currentTarget.parentElement?.contains(e.relatedTarget)) return
          void guardar()
        }}
        placeholder="Nuevo ramo"
        aria-label="Nombre del nuevo ramo"
        className="min-h-[44px] min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-ink-tertiary"
      />
    </div>
  )
}
