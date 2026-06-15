function toEpochMs(ts: number): number {
  return ts.toString().length === 10 ? ts * 1000 : ts
}

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  dateStyle: 'short',
  timeStyle: 'medium',
}

export function formatLocaleDate(ts: number | null | undefined, locale: string): string {
  if (!ts) return '—'
  return new Date(toEpochMs(ts)).toLocaleDateString(locale)
}

export function formatLocaleDateTime(ts: number | null | undefined, locale: string): string {
  if (!ts) return '—'
  return new Date(toEpochMs(ts)).toLocaleString(locale, dateTimeOptions)
}

export function formatLocaleDateTimeFromIso(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale, dateTimeOptions)
}
