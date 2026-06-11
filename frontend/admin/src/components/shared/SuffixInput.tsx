import { cn } from '@/lib/utils'
import { dialogAddonCls, inputCls } from '@/lib/form-styles'

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
        <span className={cn(dialogAddonCls, 'z-[-1] rounded-l-md rounded-r-none border-r-0')}>
          {prefix}
        </span>
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
      <span className={cn(dialogAddonCls, 'z-[-1] rounded-r-md rounded-l-none border-l-0')}>
        {suffix}
      </span>
    </div>
  )
}
