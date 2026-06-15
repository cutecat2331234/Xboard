export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / 1024 ** i
  return `${val.toFixed(i > 0 ? 2 : 0)} ${units[i]}`
}

/** Plan catalog stores transfer_enable in GB; user subscription uses bytes. */
export function formatPlanTrafficGb(gb: number): string {
  if (!gb || gb <= 0) return '0 GB'
  const rounded = Number.isInteger(gb) ? String(gb) : gb.toFixed(2).replace(/\.?0+$/, '')
  return `${rounded} GB`
}

import { formatLocaleDate } from './format-date'

export function formatExpire(ts: number | null | undefined, locale: string): string {
  return formatLocaleDate(ts, locale)
}
