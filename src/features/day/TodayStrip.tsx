import { Pressable, Text, View } from 'react-native'
import { Checkbox } from '../../components/Checkbox'
import { CATEGORY_COLOR, CATEGORY_LABEL, courseColor } from '../../design/palette'
import { RECURRING_ALPHA, TOKENS } from '../../design/tokens'
import type { FranjaSuperior } from '../../logic/dayTimeline'
import { usePlannerStore } from '../../store/usePlannerStore'
import { ramoById } from '../../store/selectors'
import type { RefTipo } from '../../model/types'

export interface PedidoAgendar {
  titulo: string
  ref: { tipo: RefTipo; id: string }
}

/**
 * The *what* half of the day: everything with no hour of its own. Every row
 * offers "Agendar", which is how something without a time gets one.
 */
export function TodayStrip({
  franja,
  onAgendar,
}: {
  franja: FranjaSuperior
  onAgendar: (pedido: PedidoAgendar) => void
}) {
  const data = usePlannerStore((s) => s.data)
  const updateTarea = usePlannerStore((s) => s.updateTarea)

  return (
    <View className="border-b border-border-hairline pb-2">
      {franja.evaluaciones.map((evaluacion) => {
        const ramo = ramoById(data, evaluacion.ramoId)
        return (
          <Fila
            key={evaluacion.id}
            {...(ramo ? { color: courseColor(ramo.color) } : {})}
            titulo={evaluacion.titulo}
            alta={evaluacion.importancia === 'alta'}
            {...(ramo?.nombre ? { detalle: ramo.nombre } : {})}
            onAgendar={() =>
              onAgendar({
                titulo: evaluacion.titulo,
                ref: { tipo: 'evaluacion', id: evaluacion.id },
              })
            }
          />
        )
      })}

      {franja.compromisosSinHora.map((compromiso) => (
        <Fila
          key={compromiso.id}
          color={courseColor(CATEGORY_COLOR[compromiso.categoria])}
          tenue={compromiso.recurrencia !== undefined}
          titulo={compromiso.titulo}
          alta={compromiso.importancia === 'alta'}
          detalle={CATEGORY_LABEL[compromiso.categoria]}
          onAgendar={() =>
            onAgendar({
              titulo: compromiso.titulo,
              ref: { tipo: 'compromiso', id: compromiso.id },
            })
          }
        />
      ))}

      {franja.tareas.map((tarea) => (
        <View key={tarea.id} className="flex-row items-center gap-2">
          <Checkbox
            label={tarea.titulo}
            checked={tarea.hecha}
            onChange={(hecha) => void updateTarea(tarea.id, { hecha })}
          />
          <Text
            numberOfLines={1}
            className={`min-h-[44px] flex-1 text-body ${
              tarea.hecha ? 'text-ink-tertiary line-through' : 'text-ink'
            }`}
          >
            {tarea.titulo}
          </Text>
          {!tarea.hecha && (
            <BotonAgendar
              onPress={() =>
                onAgendar({ titulo: tarea.titulo, ref: { tipo: 'tarea', id: tarea.id } })
              }
            />
          )}
        </View>
      ))}
    </View>
  )
}

function Fila({
  color,
  titulo,
  detalle,
  alta = false,
  tenue = false,
  onAgendar,
}: {
  color?: string
  titulo: string
  detalle?: string
  alta?: boolean
  tenue?: boolean
  onAgendar: () => void
}) {
  return (
    <View className="min-h-[44px] flex-row items-center gap-3">
      <View
        className="h-6 w-1 rounded-bar"
        style={{
          backgroundColor: color ?? TOKENS.borderStrong,
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
        {detalle && <Text className="text-meta text-ink-tertiary">{detalle}</Text>}
      </View>
      <BotonAgendar onPress={onAgendar} />
    </View>
  )
}

const BotonAgendar = ({ onPress }: { onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    className="min-h-[44px] justify-center rounded-card border border-border-strong px-3"
  >
    <Text className="text-meta text-ink">Agendar</Text>
  </Pressable>
)
