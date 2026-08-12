import { parseHoraCorta } from '../lib/time'
import type { HoraHHMM } from '../lib/date'

/** Same idea as DateInput: "19", "19:30" and "1930" all work. */
export function TimeInput({
  value,
  onChange,
  label,
  placeholder = '19:30',
}: {
  value: string
  onChange: (texto: string, hora: HoraHHMM | null) => void
  label: string
  placeholder?: string
}) {
  const vacio = value.trim() === ''
  const error = !vacio && parseHoraCorta(value) === null

  return (
    <label className="flex flex-col">
      <span className="text-meta text-ink-tertiary">{label}</span>
      <input
        value={value}
        inputMode="numeric"
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value, parseHoraCorta(e.target.value))}
        className={`min-h-[44px] w-20 border-b border-border-hairline text-body outline-none placeholder:text-ink-tertiary ${
          error ? 'text-importance' : ''
        }`}
      />
    </label>
  )
}
