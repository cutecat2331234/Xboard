import { ref } from 'vue'
import { fetchGuestConfig, type GuestConfig } from '@/api/comm'

const config = ref<GuestConfig | null>(null)
let loading: Promise<GuestConfig> | null = null

export function useGuestConfig() {
  async function load(options?: { force?: boolean }) {
    if (options?.force) {
      config.value = null
      loading = null
    }
    if (config.value) return config.value
    if (!loading) {
      loading = fetchGuestConfig()
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
