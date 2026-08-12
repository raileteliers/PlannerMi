import { Link } from 'react-router'
import { ExportImport } from '../features/settings/ExportImport'

export function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <h1 className="text-title font-bold">Ajustes</h1>

      <ExportImport />

      <Link
        to="/paleta"
        className="mt-8 flex min-h-[44px] items-center text-body underline"
      >
        Ver la paleta de colores
      </Link>
    </div>
  )
}
