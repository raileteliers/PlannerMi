/**
 * The closed data palette. Anything that carries color in the UI picks from
 * here — never a raw hex at the call site.
 */

export type ColorToken = 'blue' | 'teal' | 'green' | 'amber' | 'violet' | 'magenta'

export const COURSE_COLORS: ColorToken[] = [
  'blue',
  'teal',
  'green',
  'amber',
  'violet',
  'magenta',
]

/** The hex for a course color. React Native has no `var()`. */
const COURSE_HEX: Record<ColorToken, string> = {
  blue: '#2563eb',
  teal: '#0f766e',
  green: '#15803d',
  amber: '#b45309',
  violet: '#7c3aed',
  magenta: '#be185d',
}

export const courseColor = (token: ColorToken): string => COURSE_HEX[token]

export type CategoriaCompromiso = 'salud' | 'deporte' | 'tramite' | 'personal'

export const CATEGORY_COLOR: Record<CategoriaCompromiso, ColorToken> = {
  deporte: 'blue',
  salud: 'green',
  tramite: 'amber',
  personal: 'violet',
}

export const CATEGORY_LABEL: Record<CategoriaCompromiso, string> = {
  salud: 'Salud',
  deporte: 'Deporte',
  tramite: 'Trámite',
  personal: 'Personal',
}
