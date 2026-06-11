export type NavItem = {
  path: string
  labelKey: string
  apiPath?: string
  end?: boolean
}

export const ADMIN_NAV: NavItem[] = [
  { path: '/', labelKey: 'nav.dashboard', apiPath: '/stat/getOverride', end: true },
  { path: '/config', labelKey: 'nav.systemConfig', apiPath: '/config/fetch' },
  { path: '/plugin', labelKey: 'nav.pluginManagement', apiPath: '/plugin/getPlugins' },
  { path: '/theme', labelKey: 'nav.themeConfig', apiPath: '/theme/getThemes' },
  { path: '/notice', labelKey: 'nav.noticeManagement', apiPath: '/notice/fetch' },
  { path: '/payment', labelKey: 'nav.paymentConfig', apiPath: '/payment/fetch' },
  { path: '/knowledge', labelKey: 'nav.knowledgeManagement', apiPath: '/knowledge/fetch' },
  { path: '/server/manage', labelKey: 'nav.nodeManagement', apiPath: '/server/manage/getNodes' },
  { path: '/server/machine', labelKey: 'nav.machineManagement', apiPath: '/server/machine/fetch' },
  { path: '/server/group', labelKey: 'nav.permissionGroupManagement', apiPath: '/server/group/fetch' },
  { path: '/server/route', labelKey: 'nav.routeManagement', apiPath: '/server/route/fetch' },
  { path: '/plan', labelKey: 'nav.planManagement', apiPath: '/plan/fetch' },
  { path: '/order', labelKey: 'nav.orderManagement', apiPath: '/order/fetch' },
  { path: '/coupon', labelKey: 'nav.couponManagement', apiPath: '/coupon/fetch' },
  { path: '/gift-card', labelKey: 'nav.giftCardManagement', apiPath: '/gift-card/templates' },
  { path: '/user', labelKey: 'nav.userManagement', apiPath: '/user/fetch' },
  { path: '/ticket', labelKey: 'nav.ticketManagement', apiPath: '/ticket/fetch' },
]
