import { ref } from 'vue'
import { fetchUserCommConfig, type UserCommConfig } from '@/api/comm'

const config = ref<UserCommConfig | null>(null)
let loading: Promise<UserCommConfig> | null = null

export function useUserCommConfig() {
  async function load(options?: { force?: boolean }): Promise<UserCommConfig> {
    if (options?.force) {
      loading = null            // 强制重拉:丢弃在途 promise,但保留 config.value 不清空
    } else if (config.value) {
      return config.value       // 非强制:命中缓存
    }
    if (!loading) {
      loading = fetchUserCommConfig()
        .then((data) => {
          config.value = data   // 仅在新数据到达时更新,过程中旧值一直可见
          return data
        })
        .catch((error) => {
          loading = null
          throw error
        })
    }
    return loading
  }

  function reset() {
    config.value = null
    loading = null
  }

  return { config, load, reset }
}
