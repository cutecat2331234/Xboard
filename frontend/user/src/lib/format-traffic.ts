export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / 1024 ** i
  return `${val.toFixed(i > 0 ? 2 : 0)} ${units[i]}`
}

import { formatLocaleDate } from './format-date'

export function formatExpire(ts: number | null | undefined, locale: string): string {
  return formatLocaleDate(ts, locale)
}
