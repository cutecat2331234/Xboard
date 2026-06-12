import { useState } from 'react'
import { IconCalendar } from '@tabler/icons-react'
import { format } from 'date-fns'

import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

function tsToDate(ts?: number | null) {
  if (!ts) return undefined
  return new Date(ts * 1000)
}

function dateToTs(date: Date): number {
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
  return Math.floor(end.getTime() / 1000)
}

type Props = {
  value?: number | null
  onChange: (ts: number | null) => void
  placeholder?: string
  className?: string
}

/** 7001: outline trigger + Popover calendar (not native date input). */
export function ExpireDateInput({ value, onChange, placeholder, className }: Props) {
  const [open, setOpen] = useState(false)
  const selected = tsToDate(value)
  const [month, setMonth] = useState(() => selected ?? new Date())
  const label = selected ? format(selected, 'yyyy-MM-dd') : ''

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left font-mono text-xs font-normal shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            !label && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{label || placeholder}</span>
          <IconCalendar className="tabler-icon h-3 w-3 shrink-0 opacity-50" stroke={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={(date) => {
            onChange(dateToTs(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
