import { useState } from 'react'
import { Text, View } from 'react-native'
import { ColorChip } from '../../components/ColorChip'
import { DateInput } from '../../components/DateInput'
import { formatFechaCorta } from '../../lib/dateInput'
import { usePlannerStore } from '../../store/usePlannerStore'
import { ramoById } from '../../store/selectors'
import type { ISODate, Tarea } from '../../model/types'
import { CampoTitulo, FormActions } from './FormPieces'

/** Tasks are the loosest thing in the model: no date and no evaluación is fine. */
export function TareaForm({
  fecha: fechaInicial,
  existente,
  onClose,
}: {
  fecha: ISODate
  existente?: Tarea
  onClose: () => void
}) {
  const data = usePlannerStore((s) => s.data)
  const createTarea = usePlannerStore((s) => s.createTarea)
  const updateTarea = usePlannerStore((s) => s.updateTarea)
  const deleteTarea = usePlannerStore((s) => s.deleteTarea)

  const [titulo, setTitulo] = useState(existente?.titulo ?? '')
  const [fecha, setFecha] = useState<ISODate | null>(existente?.fecha ?? fechaInicial)
  const [evaluacionId, setEvaluacionId] = useState(existente?.evaluacionId ?? '')
  const [error, setError] = useState<string | null>(null)

  // Only upcoming evaluaciones of live ramos: nobody hangs a task off a past one.
  const candidatas = data.evaluaciones
    .filter((e) => ramoById(data, e.ramoId)?.archivado === false)
    .filter((e) => e.fecha >= (fecha ?? fechaInicial) || e.id === evaluacionId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 8)

  async function guardar() {
    if (titulo.trim() === '') return setError('Ponele un título.')

    const campos = {
      titulo: titulo.trim(),
      hecha: existente?.hecha ?? false,
      ...(fecha ? { fecha } : {}),
      ...(evaluacionId ? { evaluacionId } : {}),
    }
    const ok = existente
      ? await updateTarea(existente.id, {
          ...campos,
          ...(fecha ? {} : { fecha: undefined }),
          ...(evaluacionId ? {} : { evaluacionId: undefined }),
        })
      : (await createTarea(campos)) !== null
    if (ok) onClose()
  }

  return (
    <View className="gap-3 pb-2 pt-1">
      <CampoTitulo
        value={titulo}
        onChange={(v) => {
          setTitulo(v)
          setError(null)
        }}
        placeholder="¿Qué hay que hacer?"
        autoFocus={!existente}
      />

      <DateInput
        label="Fecha (opcional)"
        opcional
        value={fecha}
        onChange={setFecha}
        placeholder="sin fecha"
      />

      {candidatas.length > 0 && (
        <View>
          <Text className="text-meta text-ink-tertiary">¿Es para alguna evaluación?</Text>
          <View
            className="mt-1 flex-row flex-wrap gap-2"
            accessibilityRole="radiogroup"
            accessibilityLabel="Evaluación"
          >
            {candidatas.map((evaluacion) => {
              const activo = evaluacion.id === evaluacionId
              const ramo = ramoById(data, evaluacion.ramoId)
              return (
                <ColorChip
                  key={evaluacion.id}
                  label={evaluacion.titulo}
                  detalle={formatFechaCorta(evaluacion.fecha)}
                  {...(ramo ? { color: ramo.color } : {})}
                  activo={activo}
                  onPress={() => setEvaluacionId(activo ? '' : evaluacion.id)}
                />
              )
            })}
          </View>
        </View>
      )}

      <FormActions
        error={error}
        onGuardar={() => void guardar()}
        {...(existente
          ? {
              onEliminar: () => void deleteTarea(existente.id).then(onClose),
              tituloEliminar: `¿Eliminar ${existente.titulo}?`,
            }
          : {})}
      />
    </View>
  )
}
