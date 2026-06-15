import { getLocale } from '@/lib/i18n'

export function formatAdminDateTime(ts?: number | null): string {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString(getLocale(), {
    dateStyle: 'short',
    timeStyle: 'medium',
  })
}
