import { useRef, useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { todayISO } from '../../lib/date'
import { validateImportText } from '../../logic/importExport'
import { usePlannerStore } from '../../store/usePlannerStore'
import type { Dataset } from '../../model/types'

/**
 * The backup, and the only migration path if the app is ever packaged as an
 * APK: Chrome's IndexedDB and a WebView's are different databases.
 */
export function ExportImport() {
  const data = usePlannerStore((s) => s.data)
  const buildExportFile = usePlannerStore((s) => s.buildExportFile)
  const replaceAll = usePlannerStore((s) => s.replaceAll)

  const fileRef = useRef<HTMLInputElement>(null)
  const [errores, setErrores] = useState<string[]>([])
  const [pendiente, setPendiente] = useState<{ datos: Dataset; avisos: string[] } | null>(null)

  function exportar() {
    const contenido = JSON.stringify(buildExportFile(), null, 2)
    const url = URL.createObjectURL(new Blob([contenido], { type: 'application/json' }))
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `plannermi-${todayISO()}.json`
    enlace.click()
    URL.revokeObjectURL(url)
  }

  /** Validated whole before anything is written: a bad file changes nothing. */
  async function elegirArchivo(archivo: File) {
    setErrores([])
    setPendiente(null)

    const resultado = validateImportText(await archivo.text())
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
    <section className="mt-6">
      <h2 className="text-body font-bold">Tus datos</h2>
      <p className="mt-1 text-meta text-ink-secondary">
        {resumen(data)}
      </p>

      <button
        type="button"
        onClick={exportar}
        className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-card bg-accent text-body text-on-accent"
      >
        Exportar JSON
      </button>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-card border border-border-strong text-body"
      >
        Importar JSON
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          e.target.value = '' // let the same file be picked twice
          if (archivo) void elegirArchivo(archivo)
        }}
      />

      {errores.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {errores.map((mensaje) => (
            <li key={mensaje} className="text-meta text-importance">
              {mensaje}
            </li>
          ))}
        </ul>
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
    </section>
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
