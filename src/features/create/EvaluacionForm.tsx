import { useState } from 'react'
import { Link } from 'expo-router'
import { Text, TextInput, View } from 'react-native'
import { ChipGroup } from '../../components/ChipGroup'
import { ColorChip } from '../../components/ColorChip'
import { DateInput } from '../../components/DateInput'
import { IMPORTANCIA_LABEL, TIPO_LABEL } from '../../design/labels'
import { TOKENS } from '../../design/tokens'
import { usePlannerStore } from '../../store/usePlannerStore'
import { ramosActivos } from '../../store/selectors'
import {
  IMPORTANCIAS,
  TIPOS_EVALUACION,
  type Evaluacion,
  type ISODate,
} from '../../model/types'
import { CampoTitulo, FormActions } from './FormPieces'

export function EvaluacionForm({
  fecha: fechaInicial,
  existente,
  onClose,
}: {
  fecha: ISODate
  existente?: Evaluacion
  onClose: () => void
}) {
  const data = usePlannerStore((s) => s.data)
  const createEvaluacion = usePlannerStore((s) => s.createEvaluacion)
  const updateEvaluacion = usePlannerStore((s) => s.updateEvaluacion)
  const deleteEvaluacion = usePlannerStore((s) => s.deleteEvaluacion)
  const planDeleteEvaluacion = usePlannerStore((s) => s.planDeleteEvaluacion)

  const ramos = ramosActivos(data)
  const [ramoId, setRamoId] = useState(existente?.ramoId ?? ramos[0]?.id ?? '')
  const [titulo, setTitulo] = useState(existente?.titulo ?? '')
  const [fecha, setFecha] = useState<ISODate | null>(existente?.fecha ?? fechaInicial)
  const [tipo, setTipo] = useState<Evaluacion['tipo']>(existente?.tipo ?? 'prueba')
  const [importancia, setImportancia] = useState(existente?.importancia ?? 'media')
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? '')
  const [error, setError] = useState<string | null>(null)

  if (ramos.length === 0) {
    return (
      <View className="py-4">
        <Text className="text-body text-ink-secondary">
          Una evaluación va en un ramo, y todavía no tenés ninguno.
        </Text>
        <Link
          href="/ramos"
          onPress={onClose}
          className="mt-4 min-h-[44px] text-body text-ink underline"
        >
          Crear un ramo
        </Link>
      </View>
    )
  }

  async function guardar() {
    if (titulo.trim() === '') return setError('Ponele un título.')
    if (!fecha) return setError('Revisá la fecha.')

    const campos = {
      ramoId,
      titulo: titulo.trim(),
      fecha,
      tipo,
      importancia,
      ...(descripcion.trim() === '' ? {} : { descripcion: descripcion.trim() }),
    }
    const ok = existente
      ? await updateEvaluacion(existente.id, {
          ...campos,
          ...(descripcion.trim() === '' ? { descripcion: undefined } : {}),
        })
      : (await createEvaluacion(campos)) !== null
    if (ok) onClose()
  }

  return (
    <View className="gap-3 pb-2 pt-1">
      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup" accessibilityLabel="Ramo">
        {ramos.map((ramo) => (
          <ColorChip
            key={ramo.id}
            label={ramo.sigla ?? ramo.nombre}
            color={ramo.color}
            activo={ramo.id === ramoId}
            onPress={() => setRamoId(ramo.id)}
          />
        ))}
      </View>

      <CampoTitulo
        value={titulo}
        onChange={(v) => {
          setTitulo(v)
          setError(null)
        }}
        placeholder="Prueba 1, Entrega final…"
        autoFocus={!existente}
      />

      <DateInput label="Fecha" value={fecha} onChange={setFecha} />

      <ChipGroup
        label="Tipo"
        value={tipo}
        options={TIPOS_EVALUACION}
        labels={TIPO_LABEL}
        onChange={setTipo}
      />
      <ChipGroup
        label="Importancia"
        value={importancia}
        options={IMPORTANCIAS}
        labels={IMPORTANCIA_LABEL}
        onChange={setImportancia}
      />

      <TextInput
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Descripción (opcional)"
        placeholderTextColor={TOKENS.inkTertiary}
        accessibilityLabel="Descripción"
        className="min-h-[44px] border-b border-border-hairline text-body text-ink"
      />

      <FormActions
        error={error}
        onGuardar={() => void guardar()}
        {...(existente
          ? {
              onEliminar: () => void deleteEvaluacion(existente.id).then(onClose),
              tituloEliminar: `¿Eliminar ${existente.titulo}?`,
              detalleEliminar: detalleTareas(planDeleteEvaluacion(existente.id).tareaIds.length),
            }
          : {})}
      />
    </View>
  )
}

const detalleTareas = (tareas: number): string =>
  tareas === 0
    ? 'No tiene tareas.'
    : `Se eliminan también ${tareas === 1 ? 'su tarea' : `sus ${tareas} tareas`}.`
