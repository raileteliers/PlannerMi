import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { todayISO } from '../../lib/date'
import { pickJSON, shareJSON } from '../../lib/files'
import { validateImportText } from '../../logic/importExport'
import { usePlannerStore } from '../../store/usePlannerStore'
import type { Dataset } from '../../model/types'

/**
 * The backup, and the only way data moves between installs — uninstalling the
 * app takes its database with it.
 *
 * Exporting opens the system share sheet rather than writing to a folder: an
 * app cannot drop a file into Descargas unasked, and a backup that only lives
 * inside the app is not a backup.
 */
export function ExportImport() {
  const data = usePlannerStore((s) => s.data)
  const buildExportFile = usePlannerStore((s) => s.buildExportFile)
  const replaceAll = usePlannerStore((s) => s.replaceAll)

  const [errores, setErrores] = useState<string[]>([])
  const [pendiente, setPendiente] = useState<{ datos: Dataset; avisos: string[] } | null>(
    null,
  )

  async function exportar() {
    setErrores([])
    try {
      await shareJSON(
        `plannermi-${todayISO()}.json`,
        JSON.stringify(buildExportFile(), null, 2),
      )
    } catch (error) {
      console.error('[plannermi] export failed', error)
      setErrores(['No se pudo exportar.'])
    }
  }

  /** Validated whole before anything is written: a bad file changes nothing. */
  async function importar() {
    setErrores([])
    setPendiente(null)

    let texto: string | null
    try {
      texto = await pickJSON()
    } catch (error) {
      console.error('[plannermi] import failed', error)
      return setErrores(['No se pudo leer el archivo.'])
    }
    // The picker was dismissed, which is not an error.
    if (texto === null) return

    const resultado = validateImportText(texto)
    if (!resultado.ok) return setErrores(resultado.errores)
    setPendiente({ datos: resultado.datos, avisos: resultado.avisos })
  }

  async function confirmarImport() {
    if (!pendiente) return
    const ok = await replaceAll(pendiente.datos)
    setPendiente(null)
    if (ok && pendiente.avisos.length > 0) setErrores(pendiente.avisos)
  }

  return (
    <View className="mt-6">
      <Text className="text-body font-bold text-ink">Tus datos</Text>
      <Text className="mt-1 text-meta text-ink-secondary">{resumen(data)}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => void exportar()}
        className="mt-3 min-h-[44px] items-center justify-center rounded-card bg-accent"
      >
        <Text className="text-body text-on-accent">Exportar JSON</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => void importar()}
        className="mt-2 min-h-[44px] items-center justify-center rounded-card border border-border-strong"
      >
        <Text className="text-body text-ink">Importar JSON</Text>
      </Pressable>

      {errores.length > 0 && (
        <View className="mt-3 gap-1">
          {errores.map((mensaje) => (
            <Text key={mensaje} className="text-meta text-importance">
              {mensaje}
            </Text>
          ))}
        </View>
      )}

      {pendiente && (
        <ConfirmDialog
          titulo="¿Reemplazar tus datos?"
          detalle={`El archivo trae ${resumen(pendiente.datos)}. Lo que tenés ahora se pierde.`}
          confirmLabel="Importar"
          onConfirm={() => void confirmarImport()}
          onCancel={() => setPendiente(null)}
        />
      )}
    </View>
  )
}

const resumen = (data: Dataset): string =>
  [
    `${data.ramos.length} ${data.ramos.length === 1 ? 'ramo' : 'ramos'}`,
    `${data.evaluaciones.length} ${data.evaluaciones.length === 1 ? 'evaluación' : 'evaluaciones'}`,
    `${data.compromisos.length} ${data.compromisos.length === 1 ? 'compromiso' : 'compromisos'}`,
    `${data.tareas.length} ${data.tareas.length === 1 ? 'tarea' : 'tareas'}`,
    `${data.bloques.length} ${data.bloques.length === 1 ? 'bloque' : 'bloques'}`,
  ].join(' · ')
