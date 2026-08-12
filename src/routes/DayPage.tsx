import { useParams } from 'react-router'
import { PlaceholderScreen } from './MonthPage'

export function DayPage() {
  const { fecha } = useParams()
  return <PlaceholderScreen title={`Día ${fecha ?? ''}`} />
}
