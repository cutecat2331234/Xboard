import flags from '@/components/shared/flag-svgs.json'
import { cn } from '@/lib/utils'

type Props = {
  locale: string
  className?: string
}

/** Render flag SVG as direct child nodes (7001 sign-in locale button uses button > svg). */
export function InlineFlag({ locale, className }: Props) {
  const svg = flags[locale as keyof typeof flags] ?? flags['en-US']
  return (
    <span
      className={cn('inline-flex shrink-0 [&>svg]:h-4 [&>svg]:w-5 [&>svg]:rounded-sm [&>svg]:shadow-sm', className)}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
