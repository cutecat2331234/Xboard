import { ref } from 'vue'
import { fetchUserCommConfig, type UserCommConfig } from '@/api/comm'

const config = ref<UserCommConfig | null>(null)
let loading: Promise<UserCommConfig> | null = null

export function useUserCommConfig() {
  async function load(options?: { force?: boolean }): Promise<UserCommConfig> {
    if (options?.force) {
      config.value = null
      loading = null
    }
    if (config.value) return config.value
    if (!loading) {
      loading = fetchUserCommConfig()
        .then((data) => {
          config.value = data
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
