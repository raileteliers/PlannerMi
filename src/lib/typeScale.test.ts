import { describe, expect, it } from 'vitest'
import { BASE_REM, typeScaleRem } from './typeScale'

const body = (rem: number) => rem * 1.0714 // the `text-body` size, in px

describe('typeScaleRem', () => {
  it('deja la escala intacta en la pantalla para la que se dibujó', () => {
    expect(typeScaleRem(390, 1)).toBe(BASE_REM)
    expect(body(typeScaleRem(390, 1))).toBeCloseTo(15, 1)
  })

  it('achica proporcionalmente en una pantalla angosta', () => {
    // 360dp: la mayoría de los Android de gama media.
    expect(typeScaleRem(360, 1)).toBeCloseTo(BASE_REM * (360 / 390), 4)
    expect(body(typeScaleRem(360, 1))).toBeLessThan(15)
  })

  it('no baja del piso legible por angosta que sea la pantalla', () => {
    const piso = BASE_REM * 0.85
    expect(typeScaleRem(320, 1)).toBe(piso)
    expect(typeScaleRem(240, 1)).toBe(piso)
    expect(typeScaleRem(1, 1)).toBe(piso)
  })

  it('no crece en pantallas anchas: más ancho es más contenido, no más letra', () => {
    expect(typeScaleRem(430, 1)).toBe(BASE_REM)
    expect(typeScaleRem(820, 1)).toBe(BASE_REM)
  })

  it('respeta el tamaño de letra del sistema mientras sea razonable', () => {
    // Por debajo del tope no tocamos nada: React Native multiplica él mismo.
    expect(typeScaleRem(390, 1.3)).toBe(BASE_REM)
    expect(typeScaleRem(390, 1.15)).toBe(BASE_REM)
  })

  it('absorbe el exceso cuando el sistema pide una letra enorme', () => {
    // El total en pantalla es rem * systemScale, y queda topado en 1.3.
    expect(typeScaleRem(390, 2) * 2).toBeCloseTo(BASE_REM * 1.3, 6)
    expect(typeScaleRem(390, 3) * 3).toBeCloseTo(BASE_REM * 1.3, 6)
  })

  it('acumula pantalla angosta y letra grande, que es el caso que falla', () => {
    // Un teléfono chico con la letra del sistema subida: los dos ajustes pegan.
    const rem = typeScaleRem(320, 2)
    expect(rem * 2).toBeCloseTo(BASE_REM * 0.85 * 1.3, 6)
    expect(rem * 2).toBeLessThan(BASE_REM * 2)
  })
})
