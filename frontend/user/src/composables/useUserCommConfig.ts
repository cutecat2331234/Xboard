import { ref } from 'vue'
import { fetchUserCommConfig, type UserCommConfig } from '@/api/comm'

const config = ref<UserCommConfig | null>(null)
let loading: Promise<UserCommConfig> | null = null

export function useUserCommConfig() {
  async function load() {
    if (config.value) return config.value
    if (!loading) {
      loading = fetchUserCommConfig().then((data) => {
        config.value = data
        return data
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
