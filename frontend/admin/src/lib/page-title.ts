import { ALL_NAV_ITEMS } from '@/lib/nav-groups'
import { isPluginAdminPath } from '@/lib/plugin-menus'

export function titleKeyForPath(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/'
  const sorted = [...ALL_NAV_ITEMS].sort((a, b) => b.path.length - a.path.length)
  const hit = sorted.find((item) => {
    if (item.end) return path === item.path || (item.path === '/' && path === '')
    return path === item.path || path.startsWith(`${item.path}/`)
  })
  if (hit) return hit.labelKey
  return 'nav.dashboard'
}

export function titleForPath(pathname: string): boolean {
  return isPluginAdminPath(pathname)
}
