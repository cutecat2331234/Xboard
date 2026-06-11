function toEpochMs(ts: number): number {
  return ts.toString().length === 10 ? ts * 1000 : ts
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Legacy umi Vf(): YYYY-MM-DD HH:mm:ss (24h). */
export function formatFixedDateTime(ts: number | null | undefined): string {
  if (!ts) return ''
  const d = new Date(toEpochMs(ts))
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

/** Legacy umi qf(): YYYY-MM-DD. */
export function formatFixedDate(ts: number | null | undefined): string {
  if (!ts) return ''
  const d = new Date(toEpochMs(ts))
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function formatLocaleDate(ts: number | null | undefined, locale: string): string {
  if (!ts) return '—'
  return new Date(toEpochMs(ts)).toLocaleDateString(locale)
}

export function formatLocaleDateTime(ts: number | null | undefined, locale: string): string {
  if (!ts) return '—'
  return new Date(toEpochMs(ts)).toLocaleString(locale)
}
