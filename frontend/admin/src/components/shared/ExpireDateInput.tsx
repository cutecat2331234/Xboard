import { useRef } from 'react'
import { IconCalendar } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

function tsToDateValue(ts?: number | null) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dateValueToTs(value: string): number | null {
  if (!value) return null
  return Math.floor(new Date(`${value}T23:59:59`).getTime() / 1000)
}

type Props = {
  value?: number | null
  onChange: (ts: number | null) => void
  placeholder?: string
  className?: string
}

/** 7001 uses a full-width outline button with placeholder + calendar icon, not a text input. */
export function ExpireDateInput({ value, onChange, placeholder, className }: Props) {
  const pickerRef = useRef<HTMLInputElement>(null)
  const dateValue = tsToDateValue(value)

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          'inline-flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left font-mono text-xs font-normal shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          !dateValue && 'text-muted-foreground',
          className,
        )}
        onClick={() => {
          const el = pickerRef.current
          if (el?.showPicker) el.showPicker()
          else el?.focus()
        }}
      >
        <span className="truncate">{dateValue || placeholder}</span>
        <IconCalendar className="tabler-icon h-3.5 w-3.5 shrink-0 opacity-50" stroke={2} />
      </button>
      <input
        ref={pickerRef}
        type="date"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        value={dateValue}
        onChange={(e) => onChange(dateValueToTs(e.target.value))}
        tabIndex={-1}
        aria-hidden
      />
    </div>
  )
}
