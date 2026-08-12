import { usePlannerStore } from '../store/usePlannerStore'

export function MonthPage() {
  return <PlaceholderScreen title="Mes" />
}

/** Phase 1: routes exist, screens do not. Removed as each phase lands. */
export function PlaceholderScreen({ title }: { title: string }) {
  const datos = usePlannerStore((s) => s.datos)
  const estado = usePlannerStore((s) => s.estado)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <p className="text-meta text-ink-tertiary">{title}</p>
      {import.meta.env.DEV && estado === 'listo' && (
        <p className="text-meta text-ink-tertiary">
          {datos.ramos.length} ramos · {datos.evaluaciones.length} evaluaciones ·{' '}
          {datos.compromisos.length} compromisos · {datos.tareas.length} tareas ·{' '}
          {datos.bloques.length} bloques
        </p>
      )}
    </div>
  )
}
