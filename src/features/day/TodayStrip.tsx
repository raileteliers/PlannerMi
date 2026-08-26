import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CATEGORY_COLOR, CATEGORY_LABEL, courseColor } from '../../design/palette'
import { RECURRING_ALPHA, TOKENS } from '../../design/tokens'
import type { FranjaSuperior } from '../../logic/dayTimeline'
import { usePlannerStore } from '../../store/usePlannerStore'
import { ramoById } from '../../store/selectors'
import type { RefTipo } from '../../model/types'
import { PendientesSheet } from './PendientesSheet'

export interface PedidoAgendar {
  titulo: string
  ref: { tipo: RefTipo; id: string }
}

/**
 * The *what* half of the day: everything with no hour of its own. Every row
 * offers "Agendar", which is how something without a time gets one.
 *
 * The tareas are not rows here — they are a list that grows without a ceiling,
 * and the room they took came out of the timeline, which is the half you came
 * to the screen for. They live one tap away, behind "Pendientes".
 */
export function TodayStrip({
  franja,
  abrirPendientes = false,
  onAgendar,
}: {
  franja: FranjaSuperior
  /**
   * Opens the list on arrival. Set when the day was reached from the month's
   * "Pendientes", where the whole point of coming here was to see it — landing
   * on the day and having to press the button again is the same trip twice.
   */
  abrirPendientes?: boolean
  onAgendar: (pedido: PedidoAgendar) => void
}) {
  const data = usePlannerStore((s) => s.data)
  // Initial state, not a controlled prop: once here, closing it has to stick,
  // and the screen is keyed by date so a new day starts this over anyway.
  const [viendoPendientes, setViendoPendientes] = useState(abrirPendientes)

  const porHacer = franja.tareas.filter((t) => !t.hecha).length

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

      {/* Only when the day has any: a button for an empty list is a button
          that teaches you to ignore it. */}
      {franja.tareas.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Pendientes, ${porHacer} por hacer`}
          onPress={() => setViendoPendientes(true)}
          className="mt-1 min-h-[44px] flex-row items-center justify-between rounded-card border border-border-strong px-3"
        >
          <Text className="text-body text-ink">Pendientes</Text>
          <Text className="text-meta text-ink-tertiary">
            {porHacer === 0 ? 'todo hecho' : porHacer}
          </Text>
        </Pressable>
      )}

      {viendoPendientes && (
        <PendientesSheet
          tareas={franja.tareas}
          onAgendar={onAgendar}
          onClose={() => setViendoPendientes(false)}
        />
      )}
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
