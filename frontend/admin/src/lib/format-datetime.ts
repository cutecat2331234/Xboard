import { getLocale } from '@/lib/i18n'

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  dateStyle: 'short',
  timeStyle: 'medium',
}

export function formatAdminDateTime(ts?: number | null): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString(getLocale(), dateTimeOptions)
}

export function formatAdminDateTimeValue(value?: string | number | null): string {
  if (value == null || value === '') return '—'
  if (typeof value === 'number') {
    const ts = value.toString().length > 10 ? Math.floor(value / 1000) : value
    return formatAdminDateTime(ts)
  }
  const numeric = parseInt(value, 10)
  if (!Number.isNaN(numeric)) {
    const ts = value.length > 10 ? Math.floor(numeric / 1000) : numeric
    return formatAdminDateTime(ts)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(getLocale(), dateTimeOptions)
}
