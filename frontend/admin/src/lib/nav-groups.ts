import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Box,
  CreditCard,
  FileText,
  Gift,
  LayoutDashboard,
  Megaphone,
  Network,
  Palette,
  Route,
  Server,
  Settings,
  Shield,
  ShoppingCart,
  Tag,
  Ticket,
  Users,
} from 'lucide-react'

export type NavItem = {
  path: string
  labelKey: string
  icon: LucideIcon
  end?: boolean
}

export type NavGroup = {
  labelKey?: string
  icon?: LucideIcon
  items: NavItem[]
}

/** Legacy admin sidebar uses `nav.*` label keys (matches 7001). */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    labelKey: 'nav.systemManagement',
    icon: Settings,
    items: [
      { path: '/config/system', labelKey: 'nav.systemConfig', icon: Settings },
      { path: '/config/plugin', labelKey: 'nav.pluginManagement', icon: Box },
      { path: '/config/theme', labelKey: 'nav.themeConfig', icon: Palette },
      { path: '/config/notice', labelKey: 'nav.noticeManagement', icon: Megaphone },
      { path: '/config/payment', labelKey: 'nav.paymentConfig', icon: CreditCard },
      { path: '/config/knowledge', labelKey: 'nav.knowledgeManagement', icon: BookOpen },
    ],
  },
  {
    labelKey: 'nav.nodeManagement',
    icon: Server,
    items: [
      { path: '/server/machine', labelKey: 'nav.machineManagement', icon: Server },
      { path: '/server/manage', labelKey: 'nav.nodeManagement', icon: Network },
      { path: '/server/group', labelKey: 'nav.permissionGroupManagement', icon: Shield },
      { path: '/server/route', labelKey: 'nav.routeManagement', icon: Route },
    ],
  },
  {
    labelKey: 'nav.subscriptionManagement',
    icon: ShoppingCart,
    items: [
      { path: '/finance/plan', labelKey: 'nav.planManagement', icon: ShoppingCart },
      { path: '/finance/order', labelKey: 'nav.orderManagement', icon: FileText },
      { path: '/finance/coupon', labelKey: 'nav.couponManagement', icon: Tag },
      { path: '/finance/gift-card', labelKey: 'nav.giftCardManagement', icon: Gift },
    ],
  },
  {
    labelKey: 'nav.userManagement',
    icon: Users,
    items: [
      { path: '/user/manage', labelKey: 'nav.userManagement', icon: Users },
      { path: '/user/ticket', labelKey: 'nav.ticketManagement', icon: Ticket },
    ],
  },
]

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

export const COMMAND_ITEMS = [...ALL_NAV_ITEMS]
