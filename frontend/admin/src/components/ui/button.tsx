import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        variant === 'outline' &&
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
        size === 'default' && 'h-9 px-4 py-2',
        size === 'sm' && 'h-8 px-3 text-xs',
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
