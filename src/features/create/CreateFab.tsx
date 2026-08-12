import { useState } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { formatFechaCorta } from '../../lib/dateInput'
import { useUiStore } from '../../store/useUiStore'
import { EvaluacionForm } from './EvaluacionForm'
import { CompromisoForm } from './CompromisoForm'
import { TareaForm } from './TareaForm'

type Opcion = 'evaluacion' | 'compromiso' | 'tarea'

const OPCION_LABEL: Record<Opcion, string> = {
  evaluacion: 'Evaluación',
  compromiso: 'Compromiso',
  tarea: 'Tarea',
}

/** Spanish has gender: "nueva evaluación" but "nuevo compromiso". */
const OPCION_TITULO: Record<Opcion, string> = {
  evaluacion: 'Nueva evaluación',
  compromiso: 'Nuevo compromiso',
  tarea: 'Nueva tarea',
}

/**
 * One global "+". The date comes from wherever it was opened: the day you
 * tapped in the month, the day you are organizing, today anywhere else.
 */
export function CreateFab() {
  const fecha = useUiStore((s) => s.fechaContexto)
  const [abierto, setAbierto] = useState(false)
  const [opcion, setOpcion] = useState<Opcion | null>(null)

  const cerrar = () => {
    setAbierto(false)
    setOpcion(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Crear"
        className="absolute right-4 bottom-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-title text-on-accent shadow-float"
      >
        +
      </button>

      {abierto && opcion === null && (
        <BottomSheet titulo={`Agregar para el ${formatFechaCorta(fecha)}`} onClose={cerrar}>
          <ul className="pb-2">
            {(Object.keys(OPCION_LABEL) as Opcion[]).map((o) => (
              <li key={o}>
                <button
                  type="button"
                  onClick={() => setOpcion(o)}
                  className="flex min-h-[56px] w-full items-center border-b border-border-hairline text-body"
                >
                  {OPCION_LABEL[o]}
                </button>
              </li>
            ))}
          </ul>
        </BottomSheet>
      )}

      {opcion !== null && (
        <BottomSheet titulo={OPCION_TITULO[opcion]} onClose={cerrar}>
          {opcion === 'evaluacion' && <EvaluacionForm fecha={fecha} onClose={cerrar} />}
          {opcion === 'compromiso' && <CompromisoForm fecha={fecha} onClose={cerrar} />}
          {opcion === 'tarea' && <TareaForm fecha={fecha} onClose={cerrar} />}
        </BottomSheet>
      )}
    </>
  )
}
