import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { zhCN } from 'date-fns/locale'

import { cn } from '@/lib/utils'

type Props = {
  month: Date
  onMonthChange: (month: Date) => void
  selected?: Date
  onSelect: (date: Date) => void
  className?: string
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** Compact month grid for 7001-style expire date popover. */
export function Calendar({ month, onMonthChange, selected, onSelect, className }: Props) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const leading = monthStart.getDay()

  return (
    <div className={cn('p-3', className)}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
          onClick={() => onMonthChange(subMonths(month, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-mono text-xs font-medium">
          {format(month, 'yyyy年 M月', { locale: zhCN })}
        </span>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
          onClick={() => onMonthChange(addMonths(month, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="h-7 leading-7">
            {d}
          </div>
        ))}
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const picked = selected ? isSameDay(day, selected) : false
          return (
            <button
              key={day.toISOString()}
              type="button"
              className={cn(
                'h-7 w-7 rounded-md text-xs transition-colors',
                picked
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground',
                !isSameMonth(day, month) && 'text-muted-foreground/50',
              )}
              onClick={() => onSelect(day)}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
