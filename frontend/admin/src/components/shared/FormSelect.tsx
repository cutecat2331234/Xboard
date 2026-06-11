import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

/** Radix Select forbids empty string item values. */
const EMPTY_VALUE = '__none__'

function toSelectValue(v: string) {
  return v === '' ? EMPTY_VALUE : v
}

function fromSelectValue(v: string) {
  return v === EMPTY_VALUE ? '' : v
}

export type FormSelectOption = { value: string; label: string }

type Props = {
  value: string
  onChange: (value: string) => void
  options: FormSelectOption[]
  placeholder?: string
  className?: string
}

/** 7001 form dialogs use Radix combobox triggers, not native &lt;select&gt;. */
export function FormSelect({ value, onChange, options, placeholder, className }: Props) {
  const selectValue = toSelectValue(value)
  const current = options.find((o) => o.value === value)?.label

  return (
    <Select value={selectValue} onValueChange={(v) => onChange(fromSelectValue(v))}>
      <SelectTrigger className={cn(className)}>
        <SelectValue placeholder={placeholder ?? current}>{current}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value || EMPTY_VALUE} value={toSelectValue(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
