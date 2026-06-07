import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { getSettings } from '@/lib/settings'
import { ADMIN_NAV } from '@/lib/nav'
import { t } from '@/lib/i18n'

export function Sidebar() {
  const { title, logo, version } = getSettings()

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card shadow-sm">
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        {logo ? (
          <img src={logo} alt={title} className="h-8 w-8 rounded-md object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            {(title || 'X').slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title || 'XBoard'}</p>
          {version ? <p className="truncate text-xs text-muted-foreground">v{version}</p> : null}
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {ADMIN_NAV.map(({ path, labelKey, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )
            }
          >
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
