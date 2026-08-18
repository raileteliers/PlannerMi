import { describe, expect, it } from 'vitest'
import { formatFechaCorta, formatFechaEditable, parseFechaCorta } from './dateInput'

const hoy = new Date(2026, 2, 15) // 15 March 2026

describe('parseFechaCorta', () => {
  it('takes day/month and assumes the current year', () => {
    expect(parseFechaCorta('12/9', hoy)).toBe('2026-09-12')
    expect(parseFechaCorta('5/4', hoy)).toBe('2026-04-05')
  })

  it('pads single digits', () => {
    expect(parseFechaCorta('1/1', new Date(2026, 0, 1))).toBe('2026-01-01')
  })

  it('accepts other separators', () => {
    expect(parseFechaCorta('12-9', hoy)).toBe('2026-09-12')
    expect(parseFechaCorta('12.9', hoy)).toBe('2026-09-12')
    expect(parseFechaCorta('12 9', hoy)).toBe('2026-09-12')
    // What the Android number pad gives you in a Spanish locale.
    expect(parseFechaCorta('12,9', hoy)).toBe('2026-09-12')
    expect(parseFechaCorta('12,9,27', hoy)).toBe('2027-09-12')
  })

  it('accepts digits with no separator, which is all Android lets you type', () => {
    expect(parseFechaCorta('1209', hoy)).toBe('2026-09-12')
    expect(parseFechaCorta('0504', hoy)).toBe('2026-04-05')
    expect(parseFechaCorta('120927', hoy)).toBe('2027-09-12')
    expect(parseFechaCorta('12092027', hoy)).toBe('2027-09-12')
  })

  it('refuses digit runs it would have to guess at', () => {
    expect(parseFechaCorta('112', hoy)).toBeNull() // 1/12 or 11/2?
    expect(parseFechaCorta('12', hoy)).toBeNull()
    expect(parseFechaCorta('12345', hoy)).toBeNull()
    expect(parseFechaCorta('1232', hoy)).toBeNull() // month 32
  })

  it('accepts an explicit four-digit year', () => {
    expect(parseFechaCorta('12/9/2027', hoy)).toBe('2027-09-12')
  })

  it('accepts a two-digit year', () => {
    expect(parseFechaCorta('12/9/27', hoy)).toBe('2027-09-12')
  })

  it('ignores surrounding spaces', () => {
    expect(parseFechaCorta('  12/9  ', hoy)).toBe('2026-09-12')
  })

  it('rolls to next year when the date is well past', () => {
    // Loading March evaluations in December: 10/3 means next March.
    expect(parseFechaCorta('10/3', new Date(2026, 11, 1))).toBe('2027-03-10')
  })

  it('keeps the current year for a date just behind us', () => {
    // A week ago is a typo or a past evaluation, not next year's.
    expect(parseFechaCorta('8/3', hoy)).toBe('2026-03-08')
  })

  it('rejects a day that does not exist in that month', () => {
    expect(parseFechaCorta('31/2', hoy)).toBeNull()
    expect(parseFechaCorta('30/2', hoy)).toBeNull()
  })

  it('accepts 29 February on a leap year', () => {
    expect(parseFechaCorta('29/2/2028', hoy)).toBe('2028-02-29')
  })

  it('rejects 29 February on a common year', () => {
    expect(parseFechaCorta('29/2/2027', hoy)).toBeNull()
  })

  it('rejects out-of-range values', () => {
    expect(parseFechaCorta('0/9', hoy)).toBeNull()
    expect(parseFechaCorta('32/9', hoy)).toBeNull()
    expect(parseFechaCorta('12/13', hoy)).toBeNull()
    expect(parseFechaCorta('12/0', hoy)).toBeNull()
  })

  it('rejects incomplete or junk input', () => {
    expect(parseFechaCorta('', hoy)).toBeNull()
    expect(parseFechaCorta('12', hoy)).toBeNull()
    expect(parseFechaCorta('mañana', hoy)).toBeNull()
    expect(parseFechaCorta('12/sep', hoy)).toBeNull()
    expect(parseFechaCorta('12/9/2026/1', hoy)).toBeNull()
  })
})

describe('formatting', () => {
  it('shows a short Spanish date', () => {
    expect(formatFechaCorta('2026-09-12')).toMatch(/12 sep/)
  })

  it('round-trips through the editable form', () => {
    const iso = '2026-09-12'
    expect(parseFechaCorta(formatFechaEditable(iso, hoy), hoy)).toBe(iso)
  })

  it('keeps the year in the editable form when it is not the current one', () => {
    expect(formatFechaEditable('2027-09-12', hoy)).toBe('12/9/2027')
  })
})
