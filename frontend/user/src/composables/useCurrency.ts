import { ref } from 'vue'
import { fetchUserCommConfig } from '@/api/comm'

const symbol = ref('¥')
const code = ref('CNY')
let loading: Promise<void> | null = null

export function useCurrency() {
  async function load() {
    if (loading) return loading
    loading = fetchUserCommConfig()
      .then((cfg) => {
        symbol.value = cfg.currency_symbol ?? cfg.currency ?? '¥'
        code.value = cfg.currency ?? 'CNY'
      })
      .catch(() => {
        symbol.value = '¥'
        code.value = 'CNY'
      })
    return loading
  }

  function formatPrice(cents: number) {
    return `${symbol.value}${(cents / 100).toFixed(2)}`
  }

  return { symbol, code, load, formatPrice }
}
