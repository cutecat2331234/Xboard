import { ref } from 'vue'
import { fetchUserCommConfig } from '@/api/comm'

const symbol = ref('¥')
const code = ref('CNY')
let loading: Promise<void> | null = null

export function useCurrency() {
  async function load(options?: { force?: boolean }) {
    if (loading && !options?.force) return loading
    if (options?.force) loading = null
    loading = fetchUserCommConfig()
      .then((cfg) => {
        symbol.value = cfg.currency_symbol ?? cfg.currency ?? '¥'
        code.value = cfg.currency ?? 'CNY'
      })
      .catch(() => {
        symbol.value = '¥'
        code.value = 'CNY'
      })
      .finally(() => {
        loading = null
      })
    return loading
  }

  function formatAmount(cents: number) {
    return (cents / 100).toFixed(2)
  }

  function formatPrice(cents: number) {
    return `${symbol.value}${formatAmount(cents)}`
  }

  /** Legacy invite stats: `currency_symbol + " " + amount` */
  function formatPriceSpaced(cents: number) {
    return `${symbol.value} ${formatAmount(cents)}`
  }

  function reset() {
    loading = null
    symbol.value = '¥'
    code.value = 'CNY'
  }

  return { symbol, code, load, reset, formatAmount, formatPrice, formatPriceSpaced }
}
