import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { createStorage } from '../db'
import { useSession } from '../auth/useSession'
import { todayISO } from '../lib/date'
import { shareJSON } from '../lib/files'
import { usePlannerStore } from '../store/usePlannerStore'

/** The only error that takes the whole screen. Everything else is a toast. */
export function DatabaseErrorScreen({ message }: { message: string }) {
  const { session } = useSession()
  const data = usePlannerStore((s) => s.data)
  const buildExportFile = usePlannerStore((s) => s.buildExportFile)
  const [exportando, setExportando] = useState(false)

  // Only if something was read before it broke: offering to export nothing
  // would be a cruel button.
  const hayAlgoQueSalvar = Object.values(data).some((lista) => lista.length > 0)

  async function exportar() {
    setExportando(true)
    try {
      await shareJSON(
        `plannermi-rescate-${todayISO()}.json`,
        JSON.stringify(buildExportFile(), null, 2),
      )
    } catch (error) {
      console.error('[plannermi] rescue export failed', error)
    } finally {
      setExportando(false)
    }
  }

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-surface px-8">
      <Text className="text-center text-title font-bold text-ink">{message}</Text>
      <Text className="text-center text-body text-ink-secondary">
        Puede pasar si el almacenamiento del teléfono está lleno.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => void usePlannerStore.getState().start(() => createStorage(session))}
        className="min-h-[44px] justify-center rounded-card bg-accent px-6"
      >
        <Text className="text-body text-on-accent">Reintentar</Text>
      </Pressable>

      {hayAlgoQueSalvar && (
        <Pressable
          accessibilityRole="button"
          disabled={exportando}
          onPress={() => void exportar()}
          className="min-h-[44px] justify-center rounded-card border border-border-strong px-6"
        >
          <Text className="text-body text-ink">Exportar lo que se pudo leer</Text>
        </Pressable>
      )}
    </View>
  )
}
