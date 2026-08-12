import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { AppShell } from './app/AppShell'
import { MonthPage } from './routes/MonthPage'
import { DayPage } from './routes/DayPage'
import { CoursesPage } from './routes/CoursesPage'
import { SettingsPage } from './routes/SettingsPage'
import { PalettePage } from './routes/PalettePage'
import { todayISO } from './lib/date'

/** HashRouter on purpose: a future Capacitor build works without changes. */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/mes" replace />} />
          <Route path="mes" element={<MonthPage />} />
          <Route path="dia" element={<Navigate to={`/dia/${todayISO()}`} replace />} />
          <Route path="dia/:fecha" element={<DayPage />} />
          <Route path="ramos" element={<CoursesPage />} />
          <Route path="ajustes" element={<SettingsPage />} />
          <Route path="paleta" element={<PalettePage />} />
          <Route path="*" element={<Navigate to="/mes" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
