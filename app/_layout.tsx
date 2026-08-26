import '../global.css'

import { Stack, usePathname, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Pressable, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Path } from 'react-native-svg'

import { DatabaseErrorScreen } from '../src/shell/DatabaseErrorScreen'
import { useStartDatabase } from '../src/shell/useStartDatabase'
import { useAvisos } from '../src/shell/useAvisos'
import { Toast } from '../src/components/Toast'
import { CreateFab } from '../src/features/create/CreateFab'
import { TOKENS } from '../src/design/tokens'
import { useTypeScale } from '../src/design/typeScale'
import { todayISO } from '../src/lib/date'
import { usePlannerStore } from '../src/store/usePlannerStore'

export default function RootLayout() {
  // Before anything renders: the type scale has to match the screen from the
  // first frame, not after a resize.
  useTypeScale()

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppShell />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

/** Header + bottom tabs. Rendered immediately at startup, content fills in. */
function AppShell() {
  const pathname = usePathname()
  const router = useRouter()
  const fatalError = usePlannerStore((s) => s.fatalError)
  const status = usePlannerStore((s) => s.status)
  useStartDatabase()
  useAvisos()

  if (fatalError) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
        <DatabaseErrorScreen message={fatalError} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="min-h-[44px] shrink-0 flex-row items-center justify-between px-4">
        <Text className="text-title font-bold text-ink">PlannerMi</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajustes"
          onPress={() => router.push('/ajustes')}
          className="h-11 w-11 items-center justify-center"
        >
          <GearIcon />
        </Pressable>
      </View>

      <View className="relative min-h-0 flex-1 overflow-hidden">
        {/* No spinner: the shell shows and the content stays blank while the
            database opens. Rendering a screen against an empty dataset would
            claim "todavía no tenés ramos" to someone who has four. */}
        <View className="flex-1" pointerEvents={status === 'starting' ? 'none' : 'auto'}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: TOKENS.surface },
              animation: 'none',
            }}
          />
        </View>

        {/* Not on Ajustes: there is nothing to add in there. Not on the auth
            callback either — that screen is on its way somewhere else. */}
        {status !== 'starting' &&
          !pathname.startsWith('/ajustes') &&
          !pathname.startsWith('/paleta') &&
          !pathname.startsWith('/auth-callback') && <CreateFab />}
        <Toast />
      </View>

      <View className="shrink-0 flex-row border-t border-border-hairline">
        <Tab label="Mes" active={pathname.startsWith('/mes')} onPress={() => router.push('/mes')} />
        <Tab
          label="Semana"
          active={pathname.startsWith('/semana')}
          onPress={() =>
            router.push({ pathname: '/semana/[fecha]', params: { fecha: todayISO() } })
          }
        />
        <Tab
          label="Hoy"
          active={pathname.startsWith('/dia')}
          onPress={() => router.push({ pathname: '/dia/[fecha]', params: { fecha: todayISO() } })}
        />
        <Tab
          label="Ramos"
          active={pathname.startsWith('/ramos')}
          onPress={() => router.push('/ramos')}
        />
        <Tab
          label="Carga"
          active={pathname.startsWith('/carga')}
          onPress={() => router.push('/carga')}
        />
      </View>
    </SafeAreaView>
  )
}

function Tab({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className="min-h-[44px] flex-1 items-center justify-center"
    >
      <Text
        className={`text-meta ${active ? 'font-bold text-ink' : 'text-ink-secondary'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function GearIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={TOKENS.inkSecondary} strokeWidth={1.5} />
      <Path
        d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"
        stroke={TOKENS.inkSecondary}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  )
}
