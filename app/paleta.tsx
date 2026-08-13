import { ScrollView, Text, View } from 'react-native'
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  COURSE_COLORS,
  courseColor,
  type CategoriaCompromiso,
  type ColorToken,
} from '../src/design/palette'
import { RECURRING_ALPHA, TOKENS } from '../src/design/tokens'
import { alturaBarraPx } from '../src/logic/monthItems'

/**
 * Review screen for the design tokens. Not part of the product surface:
 * it exists so the palette can be checked at the size it is actually used —
 * a 4px bar on white, on the device it ships to.
 */
export default function PalettePage() {
  return (
    <ScrollView className="px-4 py-4">
      <Text className="text-title font-bold text-ink">Paleta</Text>

      <Section title="Colores de ramo — barra de 4px">
        <View className="rounded-card border border-border-hairline p-3">
          {COURSE_COLORS.map((token) => (
            <View key={token} className="flex-row items-center gap-3 py-1.5">
              <Text className="w-16 text-meta text-ink-secondary">{token}</Text>
              <Bar token={token} />
            </View>
          ))}
        </View>
        <Text className="mt-2 text-meta text-ink-secondary">
          Todos ≥ 5:1 de contraste sobre blanco y bien separados entre sí.
        </Text>
      </Section>

      <Section title="Sólido vs recurrente">
        <View className="rounded-card border border-border-hairline p-3">
          {COURSE_COLORS.slice(0, 3).map((token) => (
            <View key={token} className="flex-row items-center gap-3 py-1.5">
              <Text className="w-16 text-meta text-ink-secondary">{token}</Text>
              <Bar token={token} />
              <Bar token={token} muted />
            </View>
          ))}
        </View>
        <Text className="mt-2 text-meta text-ink-secondary">
          Sólido = ítem único. Tenue = ocurrencia recurrente.
        </Text>
      </Section>

      <Section title="Grosor: importancia y qué tan cargado está el día">
        <View className="flex-row gap-4">
          {[1, 2, 3, 4].map((n) => (
            <View key={n} className="flex-1">
              <Text className="text-meta text-ink-tertiary">{n} en el día</Text>
              <View className="mt-1 rounded-card border border-border-hairline p-1">
                {(['alta', 'media', 'baja'] as const).slice(0, Math.min(n, 3)).map((imp) => (
                  <View
                    key={imp}
                    className="mb-1 rounded-bar"
                    style={{
                      height: alturaBarraPx(imp, n),
                      backgroundColor: courseColor('blue'),
                    }}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
        <Text className="mt-2 text-meta text-ink-secondary">
          Más importante, más grueso. Día más cargado, todo más fino.
        </Text>
      </Section>

      <Section title="Categorías de compromiso">
        <View className="flex-row flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABEL) as CategoriaCompromiso[]).map((cat) => (
            <View
              key={cat}
              className="rounded-card border px-2 py-1"
              style={{ borderColor: courseColor(CATEGORY_COLOR[cat]) }}
            >
              <Text className="text-meta" style={{ color: courseColor(CATEGORY_COLOR[cat]) }}>
                {CATEGORY_LABEL[cat]}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Importancia alta">
        <View className="flex-row items-end gap-6">
          <View className="w-[52px] rounded-card border border-border-hairline p-1">
            <Text className="text-meta text-ink-secondary">14</Text>
            <View className="mt-1 gap-1">
              <Bar token="teal" />
              <Bar token="amber" muted />
            </View>
          </View>
          <View className="w-[52px] rounded-card border border-border-hairline bg-surface-muted p-1">
            <Text className="text-meta font-bold text-importance">15</Text>
            <View className="mt-1 gap-1">
              <Bar token="magenta" />
              <Bar token="blue" />
            </View>
          </View>
        </View>
        <Text className="mt-2 text-meta text-ink-secondary">
          El rojo vive solo en el número del día. Nunca en una barra. La celda de hoy va
          con fondo gris muy claro.
        </Text>
      </Section>

      <Section title="Grises">
        <View className="flex-row flex-wrap">
          <Swatch name="surface" color={TOKENS.surface} />
          <Swatch name="surface-muted" color={TOKENS.surfaceMuted} />
          <Swatch name="border" color={TOKENS.border} />
          <Swatch name="border-strong" color={TOKENS.borderStrong} />
          <Swatch name="text" color={TOKENS.ink} />
          <Swatch name="text-secondary" color={TOKENS.inkSecondary} />
          <Swatch name="text-tertiary" color={TOKENS.inkTertiary} />
          <Swatch name="importancia" color={TOKENS.importance} />
        </View>
      </Section>

      <Section title="Tipografía">
        <Text className="text-title font-bold text-ink">Título de pantalla — 20px bold</Text>
        <Text className="text-body text-ink">Contenido — 15px regular</Text>
        <Text className="text-meta text-ink-secondary">Metadato — 12px</Text>
      </Section>

      <View className="h-10" />
    </ScrollView>
  )
}

function Bar({ token, muted = false }: { token: ColorToken; muted?: boolean }) {
  return (
    <View
      className="h-[4px] flex-1 rounded-bar"
      style={{
        backgroundColor: courseColor(token),
        opacity: muted ? RECURRING_ALPHA : 1,
      }}
    />
  )
}

function Swatch({ name, color }: { name: string; color: string }) {
  return (
    <View className="w-1/2 flex-row items-center gap-2 py-1">
      <View
        className="h-8 w-8 rounded-card border border-border-hairline"
        style={{ backgroundColor: color }}
      />
      <Text className="text-meta text-ink-secondary">{name}</Text>
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-8">
      <Text className="mb-3 text-body font-bold text-ink">{title}</Text>
      {children}
    </View>
  )
}
