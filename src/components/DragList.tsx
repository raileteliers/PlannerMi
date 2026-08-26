import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Animated, PanResponder, Platform, View, type ViewStyle } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

import { TOKENS } from '../design/tokens'
import { indiceDestino } from '../logic/taskOrder'

/**
 * A list whose rows can be dragged into a different order.
 *
 * Built on PanResponder rather than react-native-gesture-handler. The gesture
 * handler version activated from synthetic events and did nothing under a real
 * mouse inside a ScrollView on the web — and the web is where this app is
 * actually used. PanResponder is React Native Web's own responder system: it
 * claims the touch on press, which is exactly the contract a drag handle wants.
 *
 * It runs on the JS thread, so this is not the silkiest possible drag. These
 * lists are a handful of rows; correctness on every platform is worth more here
 * than a frame.
 *
 * Rows are a fixed height, given rather than measured: measuring costs a layout
 * pass per row before the first drag can be resolved, and every list that uses
 * this has rows of one line by construction.
 */
export function DragList<T extends { id: string }>({
  items,
  alturaFila,
  onReordenar,
  onArrastreInicio,
  onArrastreMover,
  onSoltarEn,
  renderItem,
}: {
  items: T[]
  alturaFila: number
  onReordenar: (desde: number, hasta: number) => void
  /** Called once when a row is picked up, so the surroundings can get ready. */
  onArrastreInicio?: () => void
  /** The finger's position in window coordinates, while it moves. */
  onArrastreMover?: (x: number, y: number) => void
  /**
   * Where the row was let go, in window coordinates. Returning `true` means the
   * drop was handled elsewhere — dropped onto another day, say — and this list
   * should not also reorder itself.
   */
  onSoltarEn?: (item: T, x: number, y: number) => boolean
  renderItem: (item: T) => ReactNode
}) {
  // Which row is in hand and where it would land. Only changes when the target
  // row changes, not on every pixel, so a drag costs a few renders and not one
  // per frame.
  const [arrastre, setArrastre] = useState<{ desde: number; hasta: number } | null>(null)

  return (
    <View>
      {items.map((item, indice) => (
        <Fila
          key={item.id}
          indice={indice}
          total={items.length}
          alturaFila={alturaFila}
          arrastre={arrastre}
          setArrastre={setArrastre}
          onReordenar={onReordenar}
          {...(onArrastreInicio ? { onArrastreInicio } : {})}
          {...(onArrastreMover ? { onArrastreMover } : {})}
          {...(onSoltarEn ? { onSoltarEn: (x: number, y: number) => onSoltarEn(item, x, y) } : {})}
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
  arrastre,
  setArrastre,
  onReordenar,
  onArrastreInicio,
  onArrastreMover,
  onSoltarEn,
  children,
}: {
  indice: number
  total: number
  alturaFila: number
  arrastre: { desde: number; hasta: number } | null
  setArrastre: (a: { desde: number; hasta: number } | null) => void
  onReordenar: (desde: number, hasta: number) => void
  onArrastreInicio?: () => void
  onArrastreMover?: (x: number, y: number) => void
  onSoltarEn?: (x: number, y: number) => boolean
  children: ReactNode
}) {
  const offset = useRef(new Animated.Value(0)).current
  /**
   * The last place the finger actually was.
   *
   * The release event's own `moveX`/`moveY` cannot be trusted: a pointer-up
   * carries no movement, so they arrive stale or at zero and every drop is
   * resolved against a position the finger left long ago.
   */
  const ultima = useRef({ x: 0, y: 0 })

  // Built once. A PanResponder rebuilt mid-gesture drops the gesture already
  // in flight, and `indice` is stable for the life of a row's key.
  const responder = useMemo(
    () =>
      PanResponder.create({
        // Claimed on press, before any movement: that is what stops the
        // surrounding scroll from taking the drag away.
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: () => {
          offset.setValue(0)
          setArrastre({ desde: indice, hasta: indice })
          onArrastreInicio?.()
        },

        onPanResponderMove: (_e, gesto) => {
          offset.setValue(gesto.dy)
          setArrastre({
            desde: indice,
            hasta: indiceDestino(indice, gesto.dy, alturaFila, total),
          })
          ultima.current = { x: gesto.moveX, y: gesto.moveY }
          onArrastreMover?.(gesto.moveX, gesto.moveY)
        },

        onPanResponderRelease: (_e, gesto) => {
          const hasta = indiceDestino(indice, gesto.dy, alturaFila, total)
          const { x, y } = ultima.current
          offset.setValue(0)
          setArrastre(null)

          // Somewhere else claimed the drop — another day. Reordering here too
          // would move the task twice for one gesture.
          if (onSoltarEn?.(x, y)) return
          if (hasta !== indice) onReordenar(indice, hasta)
        },

        // A drag cut short — a call, a back gesture — still has to put the row
        // down, or it stays lifted with nothing holding it.
        onPanResponderTerminate: () => {
          offset.setValue(0)
          setArrastre(null)
        },
      }),
    [
      indice,
      total,
      alturaFila,
      offset,
      ultima,
      setArrastre,
      onReordenar,
      onArrastreInicio,
      onArrastreMover,
      onSoltarEn,
    ],
  )

  const enMano = arrastre?.desde === indice

  // Everyone else opens a gap where the row is heading, so the list shows the
  // order it would end up in rather than the order it has.
  let salto = 0
  if (arrastre && !enMano) {
    if (arrastre.desde < indice && arrastre.hasta >= indice) salto = -alturaFila
    else if (arrastre.desde > indice && arrastre.hasta <= indice) salto = alturaFila
  }

  return (
    <Animated.View
      style={[
        FILA,
        enMano
          ? { transform: [{ translateY: offset }], zIndex: 2, opacity: 0.9 }
          : { transform: [{ translateY: salto }], zIndex: 0 },
      ]}
    >
      <View
        {...responder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="Arrastrar para reordenar"
        // A 44px target around a 10px mark: the grip has to be catchable with a
        // thumb, and the drawing has to stay small enough to be a hint.
        style={AGARRE}
      >
        <Grip />
      </View>
      <View className="min-w-0 flex-1">{children}</View>
    </Animated.View>
  )
}

// Plain styles, not classNames: NativeWind does not wrap Animated.View, so a
// className there is dropped in silence and the row falls back to a column.
const FILA = { flexDirection: 'row', alignItems: 'center' } as const

const AGARRE: ViewStyle = {
  width: 28,
  minHeight: 44,
  alignItems: 'center',
  justifyContent: 'center',
  // Only the web has a pointer to change, and there it is the whole affordance.
  // React Native Web renders `grab` fine; React Native's own types only admit
  // `auto` and `pointer`, so the value is cast rather than downgraded.
  ...Platform.select({ web: { cursor: 'grab' } as unknown as ViewStyle, default: {} }),
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
