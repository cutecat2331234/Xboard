import { ALL_NAV_ITEMS } from '@/lib/nav-groups'

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
