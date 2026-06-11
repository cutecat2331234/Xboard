export function formatLocaleDate(ts: number | null | undefined, locale: string): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString(locale)
}

export function formatLocaleDateTime(ts: number | null | undefined, locale: string): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString(locale)
}
