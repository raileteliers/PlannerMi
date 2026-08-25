/**
 * The type scale is drawn once, at a reference width, and then scaled to the
 * screen it actually lands on.
 *
 * The three sizes in `tailwind.config.js` are expressed in `rem` rather than
 * `px` precisely so this file can move all of them at once: NativeWind keeps
 * `rem` as a runtime observable (metro passes `inlineRem: false`), so setting
 * it here restyles every `text-title` / `text-body` / `text-meta` in the app
 * without a single call site knowing about it.
 */
import { useEffect } from 'react'
import { Dimensions, PixelRatio, useWindowDimensions } from 'react-native'
import { rem } from 'nativewind'
import { typeScaleRem } from '../lib/typeScale'

const apply = (width: number) => rem.set(typeScaleRem(width, PixelRatio.getFontScale()))

// At import, not in the effect: an effect runs after the first render, which
// on a small screen would paint one oversized frame before shrinking it — the
// exact flash this file exists to remove.
apply(Dimensions.get('window').width)

/**
 * Keeps the type scale proportional to the screen. Called once, at the root.
 * The import above already sized the first frame; this only catches later
 * changes — rotation, split screen, a foldable opening.
 */
export function useTypeScale(): void {
  const { width } = useWindowDimensions()

  useEffect(() => {
    apply(width)
  }, [width])
}
