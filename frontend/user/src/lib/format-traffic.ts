export type TrafficUnitLabels = {
  b: string
  kb: string
  mb: string
  gb: string
  tb: string
}

export const defaultTrafficUnits: TrafficUnitLabels = {
  b: 'B',
  kb: 'KB',
  mb: 'MB',
  gb: 'GB',
  tb: 'TB',
}

export function formatBytes(bytes: number, units: TrafficUnitLabels = defaultTrafficUnits): string {
  if (!bytes || bytes <= 0) return `0 ${units.b}`
  const unitKeys: (keyof TrafficUnitLabels)[] = ['b', 'kb', 'mb', 'gb', 'tb']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unitKeys.length - 1)
  const val = bytes / 1024 ** i
  return `${val.toFixed(i > 0 ? 2 : 0)} ${units[unitKeys[i]]}`
}

/** Plan catalog stores transfer_enable in GB; user subscription uses bytes. */
export function formatPlanTrafficGb(gb: number, gbUnit = 'GB'): string {
  if (!gb || gb <= 0) return `0 ${gbUnit}`
  const rounded = Number.isInteger(gb) ? String(gb) : gb.toFixed(2).replace(/\.?0+$/, '')
  return `${rounded} ${gbUnit}`
}

import { formatLocaleDate } from './format-date'

export function formatExpire(ts: number | null | undefined, locale: string): string {
  return formatLocaleDate(ts, locale)
}

export function formatTrafficGbFromBytes(bytes: number, gbUnit = 'GB'): string {
  if (!bytes || bytes <= 0) return `0 ${gbUnit}`
  const gb = bytes / 1073741824
  return `${gb >= 1 ? Math.round(gb) : gb.toFixed(2)} ${gbUnit}`
}
