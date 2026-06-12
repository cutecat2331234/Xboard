/** Hash paths aligned with 7001 legacy admin router. */
export const ADMIN_ROUTE_PATHS: Record<string, string> = {
  'sign-in': 'sign-in',
  dashboard: '',
  config: 'config/system',
  plugin: 'config/plugin',
  theme: 'config/theme',
  notice: 'config/notice',
  payment: 'config/payment',
  knowledge: 'config/knowledge',
  server_manage: 'server/manage',
  server_machine: 'server/machine',
  server_group: 'server/group',
  server_route: 'server/route',
  plan: 'finance/plan',
  order: 'finance/order',
  coupon: 'finance/coupon',
  'gift-card': 'finance/gift-card',
  user: 'user/manage',
  ticket: 'user/ticket',
  'traffic-reset': 'traffic-reset',
}

export function gateRouteToPath(route: string): string {
  if (route === 'sign-in') return 'sign-in'
  if (route === 'dashboard') return ''
  return ADMIN_ROUTE_PATHS[route] ?? route.replace(/_/g, '/')
}

export function pathToGateRoute(pathname: string): string | undefined {
  const path = pathname.replace(/^\//, '').replace(/\/$/, '')
  if (!path || path === '/') return 'dashboard'
  const entry = Object.entries(ADMIN_ROUTE_PATHS).find(([, p]) => p === path)
  return entry?.[0]
}
