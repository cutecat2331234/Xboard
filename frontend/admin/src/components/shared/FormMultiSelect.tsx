import { useState } from 'react'

import { Check, ChevronsUpDown } from 'lucide-react'

import { inputCls } from '@/lib/form-styles'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type FormMultiSelectOption<T extends string | number = number> = {
  value: T
  label: string
}

type Props<T extends string | number = number> = {
  value: T[]
  onChange: (value: T[]) => void
  options: FormMultiSelectOption<T>[]
  placeholder?: string
  emptyText?: string
  className?: string
}

/** 7001 server dialog groups/routes: compact multiselect trigger (h-9) + popover checklist. */
export function FormMultiSelect<T extends string | number = number>({
  value,
  onChange,
  options,
  placeholder,
  emptyText,
  className,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const selected = options.filter((o) => value.includes(o.value))
  const summary = selected.map((o) => o.label).join(', ')

  function toggle(id: T) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            inputCls,
            'flex h-9 cursor-pointer items-center justify-between text-left font-normal',
            !summary && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{summary || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="max-h-48 overflow-y-auto p-1">
          {options.length ? (
            options.map((o) => (
              <button
                key={o.value}
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => toggle(o.value)}
              >
                <Check
                  className={cn('h-4 w-4', value.includes(o.value) ? 'opacity-100' : 'opacity-0')}
                />
                {o.label}
              </button>
            ))
          ) : (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
