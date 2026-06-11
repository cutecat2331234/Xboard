import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

/** Radix Select forbids empty string item values — map API '' to this sentinel. */
const EMPTY_VALUE = '__none__'

type Option = { value: string; label: string }

function toSelectValue(v: string) {
  return v === '' ? EMPTY_VALUE : v
}

function fromSelectValue(v: string) {
  return v === EMPTY_VALUE ? '' : v
}

type Props = {
  label: string
  description?: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  /** 7001 event fields use w-max combobox; reset traffic uses full width */
  triggerWidth?: 'full' | 'max'
}

export function ConfigFormSelect({
  label,
  description,
  value,
  options,
  onChange,
  triggerWidth = 'full',
}: Props) {
  const selectValue = toSelectValue(value)
  const current = options.find((o) => o.value === value)?.label ?? options[0]?.label

  return (
    <div className="xb-stack-2">
      <label className="font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-base">
        {label}
      </label>
      <div className={cn(triggerWidth === 'max' && 'relative w-max')}>
        <Select value={selectValue} onValueChange={(v) => onChange(fromSelectValue(v))}>
          <SelectTrigger className={triggerWidth === 'max' ? 'h-9 w-[140px] min-w-[140px]' : undefined}>
            <SelectValue placeholder={current}>{current}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value || EMPTY_VALUE} value={toSelectValue(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {description ? <p className="text-[0.8rem] text-muted-foreground">{description}</p> : null}
    </div>
  )
}
