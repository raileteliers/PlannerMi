import { COURSE_COLORS, courseColorVar, type ColorToken } from '../design/palette'

/** The closed palette as a row of dots. 44px targets, 16px dots. */
export function ColorPicker({
  value,
  onChange,
  label = 'Color del ramo',
}: {
  value: ColorToken
  onChange: (color: ColorToken) => void
  label?: string
}) {
  return (
    <div className="flex" role="radiogroup" aria-label={label}>
      {COURSE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={color === value}
          aria-label={color}
          onClick={() => onChange(color)}
          className="flex h-11 w-11 items-center justify-center"
        >
          <span
            className="block rounded-full"
            style={{
              background: courseColorVar(color),
              width: color === value ? 20 : 14,
              height: color === value ? 20 : 14,
              outline: color === value ? '2px solid var(--pm-text)' : 'none',
              outlineOffset: 2,
            }}
          />
        </button>
      ))}
    </div>
  )
}
