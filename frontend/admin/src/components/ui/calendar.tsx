import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { enUS, ru, zhCN } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

type Props = {
  month: Date
  onMonthChange: (month: Date) => void
  selected?: Date
  onSelect: (date: Date) => void
  className?: string
}

function resolveDateFnsLocale(language: string) {
  if (language.startsWith('zh')) return zhCN
  if (language.startsWith('ru')) return ru
  return enUS
}

/** Compact month grid for expire date popover. */
export function Calendar({ month, onMonthChange, selected, onSelect, className }: Props) {
  const { i18n } = useTranslation()
  const locale = resolveDateFnsLocale(i18n.language)
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const leading = monthStart.getDay()
  const weekStart = startOfWeek(new Date(), { locale, weekStartsOn: 0 })
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), 'EEEEE', { locale }),
  )

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
          {format(month, 'LLLL yyyy', { locale })}
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
        {weekdays.map((d) => (
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
