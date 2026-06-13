import { useMemo, useState } from 'react'
import { Command } from 'cmdk'
import { X } from 'lucide-react'
import { dialogFieldLabelCls } from '@/lib/form-styles'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

export type FormInlineMultiSelectOption = {
  value: number
  label: string
}

type Props = {
  label: string
  value: number[]
  onChange: (value: number[]) => void
  options: FormInlineMultiSelectOption[]
  placeholder?: string
  className?: string
}

/** 7001 gift template allowed/disallowed plans: inline cmdk combobox with tags. */
export function FormInlineMultiSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value],
  )

  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  function remove(id: number) {
    onChange(value.filter((v) => v !== id))
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label className={dialogFieldLabelCls}>{label}</Label>
      <Command
        className="h-auto overflow-visible rounded-md bg-transparent text-popover-foreground"
        shouldFilter={false}
      >
        <div className="rounded-md border border-input font-mono text-xs ring-offset-background focus-within:ring-1 focus-within:ring-ring">
          <div className="flex flex-wrap gap-1">
            {selected.map((o) => (
              <span
                key={o.value}
                className="inline-flex items-center gap-1 rounded-sm bg-secondary px-2 py-1 text-xs"
              >
                {o.label}
                <button
                  type="button"
                  className="rounded-sm opacity-70 hover:opacity-100"
                  onClick={() => remove(o.value)}
                  aria-label={`Remove ${o.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <Command.Input
              placeholder={placeholder}
              className="min-w-[120px] flex-1 bg-transparent px-3 py-2 outline-none placeholder:text-muted-foreground"
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
          </div>
        </div>
        {open ? (
          <Command.List className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {options.map((o) => (
              <Command.Item
                key={o.value}
                value={o.label}
                className="cursor-pointer rounded-sm px-2 py-1.5 text-xs aria-selected:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onSelect={() => toggle(o.value)}
              >
                {o.label}
              </Command.Item>
            ))}
          </Command.List>
        ) : null}
      </Command>
    </div>
  )
}
