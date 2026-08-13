import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { BottomSheet } from '../../components/BottomSheet'
import { SHADOW_FLOAT } from '../../design/tokens'
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Crear"
        onPress={() => setAbierto(true)}
        style={SHADOW_FLOAT}
        className="absolute bottom-4 right-4 z-30 h-14 w-14 items-center justify-center rounded-full bg-accent"
      >
        <Text className="text-title text-on-accent">+</Text>
      </Pressable>

      {abierto && opcion === null && (
        <BottomSheet titulo={`Agregar para el ${formatFechaCorta(fecha)}`} onClose={cerrar}>
          <View className="pb-2">
            {(Object.keys(OPCION_LABEL) as Opcion[]).map((o) => (
              <Pressable
                key={o}
                accessibilityRole="button"
                onPress={() => setOpcion(o)}
                className="min-h-[56px] justify-center border-b border-border-hairline"
              >
                <Text className="text-body text-ink">{OPCION_LABEL[o]}</Text>
              </Pressable>
            ))}
          </View>
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
