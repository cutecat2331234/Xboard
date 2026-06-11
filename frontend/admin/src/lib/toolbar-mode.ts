export type ToolbarMode = 'dashboard' | 'icon-title' | 'search-only'

/** Match 7001 admin header layout per route. */
export function toolbarModeForPath(pathname: string): ToolbarMode {
  const path = pathname.replace(/\/$/, '') || '/'
  if (path === '/') return 'dashboard'
  if (path === '/config/plugin') return 'icon-title'
  if (path.startsWith('/plugins/')) return 'icon-title'
  return 'search-only'
}
