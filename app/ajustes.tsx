import { Link } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'
import { Cuenta } from '../src/features/settings/Cuenta'
import { ExportImport } from '../src/features/settings/ExportImport'
import { DevTools } from '../src/features/settings/DevTools'

export default function SettingsPage() {
  return (
    <ScrollView className="px-4 py-3">
      <Text className="text-title font-bold text-ink">Ajustes</Text>

      <Cuenta />

      <ExportImport />

      <Link href="/paleta" className="mt-8 min-h-[44px] text-body text-ink underline">
        Ver la paleta de colores
      </Link>

      <DevTools />

      <View className="h-10" />
    </ScrollView>
  )
}
