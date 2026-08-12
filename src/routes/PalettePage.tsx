import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  COURSE_COLORS,
  courseColorVar,
  type CategoriaCompromiso,
  type ColorToken,
} from '../design/palette'

/**
 * Review screen for the design tokens. Not part of the product surface:
 * it exists so the palette can be checked at the size it is actually used —
 * a 4px bar on white.
 */
export function PalettePage() {
  return (
    <div className="h-full overflow-y-auto px-4 py-4 pb-10">
      <h1 className="text-title font-bold">Paleta</h1>

      <Section title="Colores de ramo — barra de 4px">
        <div className="rounded-card border border-border-hairline p-3">
          {COURSE_COLORS.map((token) => (
            <div key={token} className="flex items-center gap-3 py-1.5">
              <span className="w-16 text-meta text-ink-secondary">{token}</span>
              <Bar token={token} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-meta text-ink-secondary">
          Todos ≥ 5:1 de contraste sobre blanco y bien separados entre sí.
        </p>
      </Section>

      <Section title="Sólido vs recurrente">
        <div className="rounded-card border border-border-hairline p-3">
          {COURSE_COLORS.slice(0, 3).map((token) => (
            <div key={token} className="flex items-center gap-3 py-1.5">
              <span className="w-16 text-meta text-ink-secondary">{token}</span>
              <Bar token={token} />
              <Bar token={token} muted />
            </div>
          ))}
        </div>
        <p className="mt-2 text-meta text-ink-secondary">
          Sólido = ítem único. Tenue = ocurrencia recurrente.
        </p>
      </Section>

      <Section title="Categorías de compromiso">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABEL) as CategoriaCompromiso[]).map((cat) => (
            <span
              key={cat}
              className="rounded-card px-2 py-1 text-meta"
              style={{
                color: courseColorVar(CATEGORY_COLOR[cat]),
                border: `1px solid ${courseColorVar(CATEGORY_COLOR[cat])}`,
              }}
            >
              {CATEGORY_LABEL[cat]}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Importancia alta">
        <div className="flex items-end gap-6">
          <div className="w-[52px] rounded-card border border-border-hairline p-1">
            <span className="text-meta text-ink-secondary">14</span>
            <div className="mt-1 space-y-1">
              <Bar token="teal" />
              <Bar token="amber" muted />
            </div>
          </div>
          <div className="w-[52px] rounded-card border border-border-hairline bg-surface-muted p-1">
            <span className="text-meta font-bold text-importance">15</span>
            <div className="mt-1 space-y-1">
              <Bar token="magenta" />
              <Bar token="blue" />
            </div>
          </div>
        </div>
        <p className="mt-2 text-meta text-ink-secondary">
          El rojo vive solo en el número del día. Nunca en una barra. La celda de
          hoy va con fondo gris muy claro.
        </p>
      </Section>

      <Section title="Grises">
        <div className="grid grid-cols-2 gap-2">
          <Swatch name="surface" cssVar="--pm-surface" />
          <Swatch name="surface-muted" cssVar="--pm-surface-muted" />
          <Swatch name="border" cssVar="--pm-border" />
          <Swatch name="border-strong" cssVar="--pm-border-strong" />
          <Swatch name="text" cssVar="--pm-text" />
          <Swatch name="text-secondary" cssVar="--pm-text-secondary" />
          <Swatch name="text-tertiary" cssVar="--pm-text-tertiary" />
          <Swatch name="importancia" cssVar="--pm-importance-high" />
        </div>
      </Section>

      <Section title="Tipografía">
        <p className="text-title font-bold">Título de pantalla — 20px bold</p>
        <p className="text-body">Contenido — 15px regular</p>
        <p className="text-meta text-ink-secondary">Metadato — 12px</p>
      </Section>
    </div>
  )
}

function Bar({ token, muted = false }: { token: ColorToken; muted?: boolean }) {
  return (
    <span
      className="block h-[4px] flex-1 rounded-bar"
      style={{
        background: courseColorVar(token),
        opacity: muted ? 'var(--pm-recurring-alpha)' : 1,
      }}
    />
  )
}

function Swatch({ name, cssVar }: { name: string; cssVar: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-8 w-8 shrink-0 rounded-card border border-border-hairline"
        style={{ background: `var(${cssVar})` }}
      />
      <span className="text-meta text-ink-secondary">{name}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-body font-bold">{title}</h2>
      {children}
    </section>
  )
}
