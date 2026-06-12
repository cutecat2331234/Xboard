import { createElement, useMemo } from 'react'
import flags from '@/components/shared/flag-svgs.json'
import { cn } from '@/lib/utils'

type Props = {
  locale: string
  className?: string
}

function parseSvgAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([\w:-]+)\s*=\s*"([^"]*)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    attrs[m[1]] = m[2]
  }
  return attrs
}

/** Render flag as a direct `<svg>` node (7001 sign-in locale button: button > svg + span). */
export function InlineFlag({ locale, className }: Props) {
  const markup = flags[locale as keyof typeof flags] ?? flags['en-US']

  return useMemo(() => {
    const match = markup.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>$/)
    if (!match) return null
    const attrs = parseSvgAttrs(match[1])
    const { class: svgClass, ...rest } = attrs
    return createElement('svg', {
      ...rest,
      className: cn(svgClass, className),
      dangerouslySetInnerHTML: { __html: match[2] },
    })
  }, [markup, className])
}
