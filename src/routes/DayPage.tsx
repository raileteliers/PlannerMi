import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useParams } from 'react-router'
import { parseISODate } from '../lib/date'

/** Phase 4 builds this screen; today it only proves the route works. */
export function DayPage() {
  const { fecha } = useParams()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <p className="text-body text-ink-secondary">
        {fecha ? format(parseISODate(fecha), "EEEE d 'de' MMMM", { locale: es }) : 'Día'}
      </p>
      <p className="text-meta text-ink-tertiary">La vista día llega en la próxima fase.</p>
    </div>
  )
}
