/** Single-choice chips. Gray, like everything that is not data. */
export function ChipGroup<T extends string>({
  value,
  options,
  labels,
  onChange,
  label,
}: {
  value: T
  options: readonly T[]
  labels: Record<T, string>
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const activo = option === value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(option)}
            className={`min-h-[44px] rounded-card border px-3 text-meta ${
              activo
                ? 'border-ink bg-accent text-on-accent'
                : 'border-border-strong text-ink-secondary'
            }`}
          >
            {labels[option]}
          </button>
        )
      })}
    </div>
  )
}
