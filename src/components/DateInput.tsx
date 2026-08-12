import { useState } from 'react'
import { formatFechaCorta, formatFechaEditable, parseFechaCorta } from '../lib/dateInput'
import type { ISODate } from '../lib/date'

/**
 * Dates are typed, not picked: "12/9" and done. Shows what it understood
 * underneath, and turns red on what it cannot read.
 */
export function DateInput({
  value,
  onChange,
  label,
  placeholder = '12/9',
  opcional = false,
}: {
  value: ISODate | null
  onChange: (fecha: ISODate | null) => void
  label: string
  placeholder?: string
  opcional?: boolean
}) {
  const [texto, setTexto] = useState(() => (value ? formatFechaEditable(value) : ''))
  const parseada = parseFechaCorta(texto)
  const vacio = texto.trim() === ''
  const error = !vacio && parseada === null

  return (
    <label className="flex flex-col">
      <span className="text-meta text-ink-tertiary">{label}</span>
      <input
        value={texto}
        inputMode="numeric"
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => {
          setTexto(e.target.value)
          const fecha = parseFechaCorta(e.target.value)
          if (fecha) onChange(fecha)
          else if (e.target.value.trim() === '' && opcional) onChange(null)
        }}
        className={`min-h-[44px] w-full border-b border-border-hairline text-body outline-none placeholder:text-ink-tertiary ${
          error ? 'text-importance' : ''
        }`}
      />
      <span className="min-h-4 text-meta text-ink-tertiary">
        {parseada ? formatFechaCorta(parseada) : error ? 'No entiendo esa fecha' : ''}
      </span>
    </label>
  )
}
