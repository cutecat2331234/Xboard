import { cn } from '@/lib/utils'
import { inputCls } from '@/lib/form-styles'

type SuffixInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  suffix: string
  prefix?: string
}

function isDialogStyle(className?: string) {
  return Boolean(className?.includes('font-mono') || className?.includes('text-xs'))
}

function addonHeight(className?: string) {
  if (className?.includes('h-8')) return 'h-8'
  if (className?.includes('h-[36px]')) return 'h-[36px]'
  if (isDialogStyle(className)) return 'h-[34px]'
  return 'h-9'
}

function addonCls(className: string | undefined, rounded: 'left' | 'right') {
  const dialog = isDialogStyle(className)
  const h = addonHeight(className)
  return cn(
    'inline-flex shrink-0 items-center border border-input bg-transparent px-3 text-muted-foreground',
    dialog ? 'shadow-none font-mono text-xs' : 'text-sm shadow-sm',
    rounded === 'left' ? 'rounded-l-md rounded-r-none border-r-0' : 'rounded-r-md rounded-l-none border-l-0',
  )
}

export function SuffixInput({ suffix, prefix, className, type = 'text', ...props }: SuffixInputProps) {
  const spinless =
    type === 'number'
      ? '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
      : ''

  if (prefix) {
    return (
      <div className="flex w-full">
        <span className={addonCls(className, 'left')}>{prefix}</span>
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
      <span className={addonCls(className, 'right')}>{suffix}</span>
    </div>
  )
}
