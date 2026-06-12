import type { LucideIcon } from 'lucide-react'
import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  title: string
  value: string
  growth?: number
  growthLabel?: string
  subtitle?: string
  icon?: LucideIcon
  iconClassName?: string
  className?: string
  clickable?: boolean
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  growth,
  growthLabel,
  subtitle,
  icon: Icon,
  iconClassName,
  className,
  clickable,
  onClick,
}: Props) {
  const g = growth ?? 0
  const positive = g > 0
  const neutral = g === 0

  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      className={cn(
        'rounded-xl shadow transition-colors',
        (clickable || onClick) && 'cursor-pointer hover:bg-muted/50',
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
        <CardTitle className="text-sm font-medium tracking-tight">{title}</CardTitle>
        {Icon ? <Icon className={cn('h-4 w-4 text-muted-foreground', iconClassName)} /> : null}
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="text-2xl font-bold">{value}</div>
        {growth !== undefined ? (
          <div className="flex items-center pt-1">
            <TrendingUp
              className={cn(
                'h-4 w-4',
                neutral || !positive ? 'text-red-500' : 'text-emerald-500',
              )}
            />
            <span
              className={cn(
                'ml-1 text-xs',
                neutral || !positive ? 'text-red-500' : 'text-emerald-500',
              )}
            >
              {neutral ? `-${Math.abs(g)}%` : `${g}%`}
            </span>
            {growthLabel ? (
              <span className="ml-1 text-xs text-muted-foreground">{growthLabel}</span>
            ) : null}
          </div>
        ) : null}
        {subtitle ? <p className="pt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardContent>
    </Card>
  )
}
