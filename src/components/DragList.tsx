import { type ReactNode } from 'react'
import { View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'

import { TOKENS } from '../design/tokens'
import { indiceDestino } from '../logic/taskOrder'

const SIN_ARRASTRE = -1

const FILA = { flexDirection: 'row', alignItems: 'center' } as const

/**
 * A list whose rows can be dragged into a different order.
 *
 * Rows are a fixed height, given rather than measured: measuring means a
 * layout pass per row before the first drag can be resolved, and every list
 * that uses this has rows of one line by construction.
 *
 * The drag starts on a grip and nowhere else. A whole-row drag would have to
 * out-argue two gestures this app already uses on the same pixels — the
 * vertical scroll, and the horizontal swipe that changes week — and a grip
 * costs one glyph instead.
 */
export function DragList<T extends { id: string }>({
  items,
  alturaFila,
  onReordenar,
  renderItem,
}: {
  items: T[]
  alturaFila: number
  onReordenar: (desde: number, hasta: number) => void
  renderItem: (item: T) => ReactNode
}) {
  // Which row is being dragged, and how far it has travelled. Shared values
  // rather than state: this runs per frame, and per-frame React state would
  // re-render the whole list on every pixel.
  const activo = useSharedValue(SIN_ARRASTRE)
  const desplazamiento = useSharedValue(0)

  return (
    <View>
      {items.map((item, indice) => (
        <Fila
          key={item.id}
          indice={indice}
          total={items.length}
          alturaFila={alturaFila}
          activo={activo}
          desplazamiento={desplazamiento}
          onReordenar={onReordenar}
        >
          {renderItem(item)}
        </Fila>
      ))}
    </View>
  )
}

function Fila({
  indice,
  total,
  alturaFila,
  activo,
  desplazamiento,
  onReordenar,
  children,
}: {
  indice: number
  total: number
  alturaFila: number
  activo: SharedValue<number>
  desplazamiento: SharedValue<number>
  onReordenar: (desde: number, hasta: number) => void
  children: ReactNode
}) {
  const arrastre = Gesture.Pan()
    // Vertical only. Letting go sideways hands the movement back to the swipe
    // that changes week, instead of both trying to own it.
    .activeOffsetY([-4, 4])
    .failOffsetX([-14, 14])
    .onStart(() => {
      activo.value = indice
      desplazamiento.value = 0
    })
    .onUpdate((e) => {
      desplazamiento.value = e.translationY
    })
    .onEnd(() => {
      const hasta = indiceDestino(indice, desplazamiento.value, alturaFila, total)
      if (hasta !== indice) runOnJS(onReordenar)(indice, hasta)
    })
    // Also on cancel: a drag interrupted by a call or a back gesture has to put
    // the row down, or it stays lifted with nothing holding it.
    .onFinalize(() => {
      activo.value = SIN_ARRASTRE
      desplazamiento.value = 0
    })

  const estilo = useAnimatedStyle(() => {
    if (activo.value === SIN_ARRASTRE) return { transform: [{ translateY: 0 }], zIndex: 0 }

    // The row in hand follows the finger and rides above the rest.
    if (activo.value === indice) {
      return {
        transform: [{ translateY: desplazamiento.value }],
        zIndex: 2,
        opacity: 0.9,
      }
    }

    // Everyone else opens a gap where the row is heading, so the list shows
    // the order it would end up in rather than the order it has.
    const destino = indiceDestino(activo.value, desplazamiento.value, alturaFila, total)
    const sube = activo.value < indice && destino >= indice
    const baja = activo.value > indice && destino <= indice
    const salto = sube ? -alturaFila : baja ? alturaFila : 0

    return {
      transform: [{ translateY: withTiming(salto, { duration: 120 }) }],
      zIndex: 0,
    }
  })

  return (
    // Styled through `style` and not `className`: NativeWind does not wrap
    // Reanimated's Animated.View, so a className here is silently dropped and
    // the row falls back to a column with the grip stacked on top.
    <Animated.View style={[estilo, FILA]}>
      <GestureDetector gesture={arrastre}>
        <View
          accessibilityRole="adjustable"
          accessibilityLabel="Arrastrar para reordenar"
          className="h-9 w-6 items-center justify-center"
        >
          <Grip />
        </View>
      </GestureDetector>
      <View className="min-w-0 flex-1">{children}</View>
    </Animated.View>
  )
}

/** Six dots. The one shape that reads as "this can be picked up". */
function Grip() {
  return (
    <Svg width={10} height={16} viewBox="0 0 10 16" fill="none">
      {[4, 8, 12].map((y) =>
        [3, 7].map((x) => (
          <Circle key={`${x}-${y}`} cx={x} cy={y} r={1.1} fill={TOKENS.inkTertiary} />
        )),
      )}
    </Svg>
  )
}
