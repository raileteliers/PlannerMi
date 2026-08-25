/**
 * The arithmetic behind the responsive type scale. Pure and React-Native-free
 * so the boundaries can be checked without a device; the hook that applies it
 * lives in `src/design/typeScale.ts`.
 */

/** The width the layout was drawn at: iPhone 14/15, Pixel 7. */
const REFERENCE_WIDTH = 390

/** NativeWind's own default, and the base every size in the config assumes. */
export const BASE_REM = 14

/**
 * Never smaller than this. Past it the metadata line stops being readable,
 * and a truncated word beats an illegible one.
 */
const MIN_FACTOR = 0.85

/**
 * Never bigger than drawn. A wider phone should show more, not bigger: the
 * grid and the timeline gain room, the text stays where the design put it.
 */
const MAX_FACTOR = 1

/** How far the system font-size setting may push text before we absorb it. */
const MAX_SYSTEM_SCALE = 1.3

/**
 * The rem for a given screen.
 *
 * `systemScale` is the OS font-size setting. React Native multiplies by it on
 * top of whatever rem we set, so capping it means handing back a *smaller*
 * rem — there is no multiplier to clamp from here.
 */
export function typeScaleRem(width: number, systemScale: number): number {
  const factor = Math.min(Math.max(width / REFERENCE_WIDTH, MIN_FACTOR), MAX_FACTOR)
  const absorbed = systemScale > MAX_SYSTEM_SCALE ? MAX_SYSTEM_SCALE / systemScale : 1
  return BASE_REM * factor * absorbed
}
