import { cn } from '@/lib/utils'
import { inputCls } from '@/lib/form-styles'

type SuffixInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  suffix: string
  prefix?: string
}

export function SuffixInput({ suffix, prefix, className, type = 'text', ...props }: SuffixInputProps) {
  const spinless =
    type === 'number'
      ? '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
      : ''

  if (prefix) {
    return (
      <div className="flex w-full">
        <div className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
          {prefix}
        </div>
        <input className={cn(inputCls, 'rounded-l-none', spinless, className)} type={type} {...props} />
      </div>
    )
  }

  return (
    <div className="flex w-full">
      <input
        className={cn(inputCls, 'rounded-r-none border-r-0', spinless, className)}
        type={type}
        {...props}
      />
      <div className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-r-md border border-input bg-muted px-3 text-sm text-muted-foreground">
        {suffix}
      </div>
    </div>
  )
}
