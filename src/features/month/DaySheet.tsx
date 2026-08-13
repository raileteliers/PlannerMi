import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { BottomSheet } from '../../components/BottomSheet'
import { Checkbox } from '../../components/Checkbox'
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  courseColor,
  type ColorToken,
} from '../../design/palette'
import { TIPO_LABEL } from '../../design/labels'
import { RECURRING_ALPHA, TOKENS } from '../../design/tokens'
import { parseISODate, type ISODate } from '../../lib/date'
import { expandCompromiso } from '../../logic/recurrence'
import { tareasDelDia } from '../../logic/monthItems'
import { usePlannerStore } from '../../store/usePlannerStore'
import { ramoById } from '../../store/selectors'
import { EvaluacionForm } from '../create/EvaluacionForm'
import { CompromisoForm } from '../create/CompromisoForm'
import { TareaForm } from '../create/TareaForm'
import type { Compromiso, Evaluacion, Tarea } from '../../model/types'

const TITULO_EDITAR = {
  evaluacion: 'Editar evaluación',
  compromiso: 'Editar compromiso',
  tarea: 'Editar tarea',
} as const

type Editando =
  | { tipo: 'evaluacion'; entidad: Evaluacion }
  | { tipo: 'compromiso'; entidad: Compromiso }
  | { tipo: 'tarea'; entidad: Tarea }

/** What that day holds, and the way into organizing it. */
export function DaySheet({ fecha, onClose }: { fecha: ISODate; onClose: () => void }) {
  const data = usePlannerStore((s) => s.data)
  const updateTarea = usePlannerStore((s) => s.updateTarea)
  const router = useRouter()
  const [editando, setEditando] = useState<Editando | null>(null)

  const evaluaciones = data.evaluaciones
    .filter((e) => e.fecha === fecha && ramoById(data, e.ramoId)?.archivado === false)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'))

  const compromisos = data.compromisos
    .filter((c) => expandCompromiso(c, { desde: fecha, hasta: fecha }).length > 0)
    .sort((a, b) => (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99'))

  const tareas = tareasDelDia(data, fecha)
  const vacio = evaluaciones.length === 0 && compromisos.length === 0 && tareas.length === 0
  const titulo = format(parseISODate(fecha), "EEEE d 'de' MMMM", { locale: es })

  // Editing replaces the list inside the same sheet: a sheet on top of a
  // sheet is two things floating, and only one thing floats at a time.
  if (editando) {
    return (
      <BottomSheet titulo={TITULO_EDITAR[editando.tipo]} onClose={() => setEditando(null)}>
        {editando.tipo === 'evaluacion' && (
          <EvaluacionForm
            fecha={fecha}
            existente={editando.entidad}
            onClose={() => setEditando(null)}
          />
        )}
        {editando.tipo === 'compromiso' && (
          <CompromisoForm
            fecha={fecha}
            existente={editando.entidad}
            fechaOcurrencia={fecha}
            onClose={() => setEditando(null)}
          />
        )}
        {editando.tipo === 'tarea' && (
          <TareaForm
            fecha={fecha}
            existente={editando.entidad}
            onClose={() => setEditando(null)}
          />
        )}
      </BottomSheet>
    )
  }

  return (
    <BottomSheet titulo={titulo} onClose={onClose}>
      {vacio ? (
        <Text className="py-4 text-body text-ink-secondary">No tenés nada ese día.</Text>
      ) : (
        <View className="pb-2">
          {evaluaciones.map((evaluacion) => {
            const ramo = ramoById(data, evaluacion.ramoId)
            return (
              <Fila
                key={evaluacion.id}
                {...(ramo ? { color: ramo.color } : {})}
                titulo={evaluacion.titulo}
                alta={evaluacion.importancia === 'alta'}
                detalle={[ramo?.nombre, TIPO_LABEL[evaluacion.tipo]]
                  .filter(Boolean)
                  .join(' · ')}
                onEditar={() => setEditando({ tipo: 'evaluacion', entidad: evaluacion })}
              />
            )
          })}

          {compromisos.map((compromiso) => (
            <Fila
              key={compromiso.id}
              color={CATEGORY_COLOR[compromiso.categoria]}
              titulo={compromiso.titulo}
              alta={compromiso.importancia === 'alta'}
              tenue={compromiso.recurrencia !== undefined}
              detalle={[compromiso.hora, CATEGORY_LABEL[compromiso.categoria]]
                .filter(Boolean)
                .join(' · ')}
              onEditar={() => setEditando({ tipo: 'compromiso', entidad: compromiso })}
            />
          ))}

          {tareas.map((tarea) => (
            <View key={tarea.id} className="flex-row items-center gap-2">
              <Checkbox
                label={tarea.titulo}
                checked={tarea.hecha}
                onChange={(hecha) => void updateTarea(tarea.id, { hecha })}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setEditando({ tipo: 'tarea', entidad: tarea })}
                className="min-h-[44px] flex-1 justify-center"
              >
                <Text
                  numberOfLines={1}
                  className={`text-body ${
                    tarea.hecha ? 'text-ink-tertiary line-through' : 'text-ink'
                  }`}
                >
                  {tarea.titulo}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onClose()
          router.push({ pathname: '/dia/[fecha]', params: { fecha } })
        }}
        className="mt-2 min-h-[44px] items-center justify-center rounded-card bg-accent"
      >
        <Text className="text-body text-on-accent">Organizar día</Text>
      </Pressable>
    </BottomSheet>
  )
}

function Fila({
  color,
  titulo,
  detalle,
  alta = false,
  tenue = false,
  onEditar,
}: {
  color?: ColorToken
  titulo: string
  detalle: string
  alta?: boolean
  tenue?: boolean
  onEditar: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onEditar}
      className="min-h-[44px] flex-row items-center gap-3"
    >
      <View
        className="h-6 w-1 rounded-bar"
        style={{
          backgroundColor: color ? courseColor(color) : TOKENS.borderStrong,
          opacity: tenue ? RECURRING_ALPHA : 1,
        }}
      />
      <View className="flex-1">
        <Text
          numberOfLines={1}
          className={`text-body ${alta ? 'font-bold text-importance' : 'text-ink'}`}
        >
          {titulo}
        </Text>
        {detalle !== '' && <Text className="text-meta text-ink-tertiary">{detalle}</Text>}
      </View>
    </Pressable>
  )
}
