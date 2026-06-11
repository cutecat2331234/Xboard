import type { ComponentType } from 'react'
import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  IconAdjustments,
  IconBuildingStore,
  IconCash,
  IconCreditCard,
  IconDeviceDesktop,
  IconDiscountCheck,
  IconFileText,
  IconGift,
  IconLayoutDashboard,
  IconLock,
  IconNews,
  IconRefresh,
  IconRoute,
  IconServer,
  IconServerBolt,
  IconServerCog,
  IconSettings,
  IconTicket,
  IconUser,
  IconUsers,
} from '@tabler/icons-react'

type IconProps = { className?: string; stroke?: number }

/** 7001 legacy sidebar icon class names (tabler-icon-{name}). */
const NAV_ICON_SUFFIX: Record<string, string> = {
  '/': 'tabler-icon-dashboard',
  '/config/system': 'tabler-icon-adjustments',
  '/config/theme': 'tabler-icon-device-desktop',
  '/config/notice': 'tabler-icon-news',
  '/config/payment': 'tabler-icon-credit-card',
  '/config/knowledge': 'tabler-icon-file-text',
  '/server/machine': 'tabler-icon-server-cog',
  '/server/manage': 'tabler-icon-server-bolt',
  '/server/group': 'tabler-icon-lock',
  '/server/route': 'tabler-icon-route',
  '/finance/plan': 'tabler-icon-building-store',
  '/finance/order': 'tabler-icon-credit-card',
  '/finance/coupon': 'tabler-icon-discount-check',
  '/finance/gift-card': 'tabler-icon-gift',
  '/user/manage': 'tabler-icon-user',
  '/user/ticket': 'tabler-icon-ticket',
  '/traffic-reset': 'tabler-icon-refresh',
}

const GROUP_ICON_SUFFIX: Record<string, string> = {
  'nav.systemManagement': 'tabler-icon-settings',
  'nav.nodeManagement': 'tabler-icon-server',
  'nav.subscriptionManagement': 'tabler-icon-cash',
  'nav.userManagement': 'tabler-icon-users',
}

export const TABLER_NAV_ICONS: Record<string, ComponentType<IconProps>> = {
  '/': IconLayoutDashboard,
  '/config/system': IconAdjustments,
  '/config/theme': IconDeviceDesktop,
  '/config/notice': IconNews,
  '/config/payment': IconCreditCard,
  '/config/knowledge': IconFileText,
  '/server/machine': IconServerCog,
  '/server/manage': IconServerBolt,
  '/server/group': IconLock,
  '/server/route': IconRoute,
  '/finance/plan': IconBuildingStore,
  '/finance/order': IconCreditCard,
  '/finance/coupon': IconDiscountCheck,
  '/finance/gift-card': IconGift,
  '/user/manage': IconUser,
  '/user/ticket': IconTicket,
  '/traffic-reset': IconRefresh,
}

export const TABLER_GROUP_ICONS: Record<string, ComponentType<IconProps>> = {
  'nav.systemManagement': IconSettings,
  'nav.nodeManagement': IconServer,
  'nav.subscriptionManagement': IconCash,
  'nav.userManagement': IconUsers,
}

export function NavIcon({ path, className }: { path: string; className?: string }) {
  if (path === '/config/plugin') {
    return <Package className={cn('lucide lucide-package', className)} strokeWidth={2} aria-hidden="true" />
  }
  const Icon = TABLER_NAV_ICONS[path]
  const suffix = NAV_ICON_SUFFIX[path]
  if (!Icon) return null
  return <Icon className={cn('tabler-icon', suffix, className)} stroke={2} />
}

export function GroupIcon({ labelKey, className }: { labelKey: string; className?: string }) {
  const Icon = TABLER_GROUP_ICONS[labelKey]
  const suffix = GROUP_ICON_SUFFIX[labelKey]
  if (!Icon) return null
  return <Icon className={cn('tabler-icon', suffix, className)} stroke={2} />
}
