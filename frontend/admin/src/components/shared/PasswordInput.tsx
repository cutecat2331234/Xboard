import { forwardRef, useState } from 'react'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

type Props = React.InputHTMLAttributes<HTMLInputElement>

/** 7001 h8e PasswordInput: relative rounded-md + Tabler eye toggle. */
export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className, ...props },
  ref,
) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative rounded-md">
      <input
        ref={ref}
        type={show ? 'text' : 'password'}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
      <button
        type="button"
        className="absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center whitespace-nowrap rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
      >
        {show ? <IconEye size={18} stroke={2} /> : <IconEyeOff size={18} stroke={2} />}
      </button>
    </div>
  )
})
