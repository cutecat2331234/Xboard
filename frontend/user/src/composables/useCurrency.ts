import { ref } from 'vue'
import { fetchUserCommConfig } from '@/api/comm'

const symbol = ref('¥')
const code = ref('CNY')
let loading: Promise<void> | null = null

export function useCurrency() {
  async function load(options?: { force?: boolean }) {
    if (options?.force) {
      loading = null            // 强制重拉:丢弃在途/已完成 promise
    } else if (loading) {
      return loading            // 非强制:复用在途/已完成 promise,实现去重
    }
    loading = fetchUserCommConfig()
      .then((cfg) => {
        symbol.value = cfg.currency_symbol ?? cfg.currency ?? '¥'
        code.value = cfg.currency ?? 'CNY'
      })
      .catch(() => {
        // 失败时丢弃缓存的 promise,下次调用可重试;并回退默认值
        loading = null
        symbol.value = '¥'
        code.value = 'CNY'
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
