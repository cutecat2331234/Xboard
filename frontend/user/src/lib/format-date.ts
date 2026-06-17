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

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Legacy panel tables use fixed `YYYY-MM-DD HH:mm:ss` regardless of locale. */
export function formatPanelDateTime(ts: number | null | undefined): string {
  if (!ts) return '—'
  const d = new Date(toEpochMs(ts))
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

export function formatLocaleDateTimeFromIso(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale, dateTimeOptions)
}
