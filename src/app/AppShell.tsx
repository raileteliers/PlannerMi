import { NavLink, Outlet, useLocation } from 'react-router'
import { todayISO } from '../lib/date'
import { usePlannerStore } from '../store/usePlannerStore'
import { useIniciarBase } from './useIniciarBase'
import { DatabaseErrorScreen } from './DatabaseErrorScreen'

const TAB_CLASS =
  'flex min-h-[44px] flex-1 items-center justify-center text-meta'

function Tab({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <NavLink
      to={to}
      className={`${TAB_CLASS} ${active ? 'font-bold text-ink' : 'text-ink-secondary'}`}
    >
      {label}
    </NavLink>
  )
}

/** Header + bottom tabs. Rendered immediately at startup, content fills in. */
export function AppShell() {
  const { pathname } = useLocation()
  const errorFatal = usePlannerStore((s) => s.errorFatal)
  useIniciarBase()

  if (errorFatal) return <DatabaseErrorScreen mensaje={errorFatal} />

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex min-h-[44px] shrink-0 items-center justify-between px-4">
        <span className="text-title font-bold">PlannerMi</span>
        <NavLink
          to="/ajustes"
          aria-label="Ajustes"
          className="flex h-11 w-11 items-center justify-center text-ink-secondary"
        >
          <GearIcon />
        </NavLink>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>

      <nav className="flex shrink-0 border-t border-border-hairline pb-[env(safe-area-inset-bottom)]">
        <Tab to="/mes" label="Mes" active={pathname.startsWith('/mes')} />
        <Tab
          to={`/dia/${todayISO()}`}
          label="Hoy"
          active={pathname.startsWith('/dia')}
        />
        <Tab to="/ramos" label="Ramos" active={pathname.startsWith('/ramos')} />
      </nav>
    </div>
  )
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
