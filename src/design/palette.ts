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

/** CSS variable holding the hex for a course color. */
export const courseColorVar = (token: ColorToken): string => `var(--pm-course-${token})`

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
