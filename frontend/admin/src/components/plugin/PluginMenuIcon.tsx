import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Shield,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MENU_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  'bar-chart-3': BarChart3,
  'credit-card': CreditCard,
  'file-text': FileText,
  package: Package,
  settings: Settings,
  shield: Shield,
  users: Users,
}

function pluginTypeIcon(type?: string): LucideIcon {
  switch (type) {
    case 'payment':
      return CreditCard
    case 'theme':
      return LayoutDashboard
    case 'feature':
      return Package
    default:
      return Settings
  }
}

export function PluginMenuIcon({
  icon,
  pluginType,
  className,
}: {
  icon?: string
  pluginType?: string
  className?: string
}) {
  const Icon = (icon && MENU_ICONS[icon]) || pluginTypeIcon(pluginType)
  return <Icon className={cn('h-[18px] w-[18px]', className)} strokeWidth={2} aria-hidden="true" />
}
