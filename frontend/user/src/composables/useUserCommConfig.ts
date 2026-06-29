import { ref } from 'vue'
import { fetchUserCommConfig, type UserCommConfig } from '@/api/comm'

const CACHE_KEY = 'xboard_comm_config'

function readCache(): UserCommConfig | null {
  try {
    const s = localStorage.getItem(CACHE_KEY)
    return s ? (JSON.parse(s) as UserCommConfig) : null
  } catch {
    return null
  }
}

function writeCache(d: UserCommConfig) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(d))
  } catch {
    /* ignore quota / serialization errors */
  }
}

const config = ref<UserCommConfig | null>(readCache()) // 同步 hydrate,首屏即有
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
          writeCache(data)      // 写入 localStorage 缓存,供下次首屏同步 hydrate
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
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch {
      /* ignore */
    }
  }

  return { config, load, reset }
}
