import { fetchConfig } from '@/lib/api'

let symbol = '¥'
let code = 'CNY'
let loaded = false
let loading: Promise<void> | null = null

export function getAdminCurrencySymbol(): string {
  return symbol
}

export function formatAdminMoney(cents?: number | null): string {
  const amount = ((cents ?? 0) / 100).toFixed(2)
  return `${symbol}${amount}`
}

export async function loadAdminCurrency(): Promise<void> {
  if (loaded) return
  if (loading) return loading

  loading = fetchConfig()
    .then((config) => {
      const site = (config.site ?? {}) as Record<string, unknown>
      symbol = String(site.currency_symbol ?? '¥')
      code = String(site.currency ?? 'CNY')
      loaded = true
    })
    .catch(() => {
      loaded = true
    })
    .finally(() => {
      loading = null
    })

  return loading
}

export function getAdminCurrencyCode(): string {
  return code
}
