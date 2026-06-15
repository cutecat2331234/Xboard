import type { TFunction } from 'i18next'

/** Format byte counts with localized unit labels (matches admin dashboard). */
export function formatAdminBytes(t: TFunction, n?: number | null): string {
  if (!n) return `0 ${t('common.units.b')}`
  const gb = n / 1073741824
  if (gb >= 1) return `${gb.toFixed(2)} ${t('common.units.gb')}`
  const mb = n / 1048576
  if (mb >= 1) return `${mb.toFixed(2)} ${t('common.units.mb')}`
  const kb = n / 1024
  if (kb >= 1) return `${kb.toFixed(2)} ${t('common.units.kb')}`
  return `${n} ${t('common.units.b')}`
}
