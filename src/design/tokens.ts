/**
 * The same values as `tailwind.config.js`, for the places that need a color
 * as a value rather than as a class — a month bar whose color comes from the
 * ramo, an SVG stroke, a native component prop.
 *
 * Mirrored by hand and deliberately short: if a color is only ever used in a
 * class, it does not belong here.
 */

export const TOKENS = {
  surface: '#ffffff',
  surfaceRaised: '#ffffff',
  surfaceMuted: '#f5f5f5',

  border: '#e5e5e5',
  borderStrong: '#d4d4d4',

  ink: '#171717',
  inkSecondary: '#737373',
  inkTertiary: '#a3a3a3',

  accent: '#171717',
  onAccent: '#ffffff',

  importance: '#dc2626',
} as const

/** Recurring items keep their hue but drop in weight. */
export const RECURRING_ALPHA = 0.35

export const RADIUS_CARD = 8
export const RADIUS_BAR = 2

/**
 * The floating shadow, as React Native wants it. `elevation` is what Android
 * actually draws; the iOS fields keep it from looking flat there.
 */
export const SHADOW_FLOAT = {
  elevation: 6,
  shadowColor: '#000000',
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 4 },
} as const
