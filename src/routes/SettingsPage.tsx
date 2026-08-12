import { Link } from 'react-router'

export function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <h1 className="text-title font-bold">Ajustes</h1>
      <p className="mt-4 text-body text-ink-secondary">
        Exportar e importar tus datos llega en una fase siguiente.
      </p>
      <Link
        to="/paleta"
        className="mt-6 flex min-h-[44px] items-center text-body underline"
      >
        Ver la paleta de colores
      </Link>
    </div>
  )
}
