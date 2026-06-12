import flags from './flag-svgs.json'

type Props = {
  locale: string
}

export function LocaleFlag({ locale }: Props) {
  const svg = flags[locale as keyof typeof flags] ?? flags['en-US']
  return (
    <span
      className="inline-flex [&>svg]:h-4 [&>svg]:w-5 [&>svg]:rounded-sm [&>svg]:shadow-sm"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
