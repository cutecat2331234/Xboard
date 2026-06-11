import { ref } from 'vue'
import { fetchGuestConfig, type GuestConfig } from '@/api/comm'

const config = ref<GuestConfig | null>(null)
let loading: Promise<GuestConfig> | null = null

export function useGuestConfig() {
  async function load() {
    if (config.value) return config.value
    if (!loading) {
      loading = fetchGuestConfig().then((data) => {
        config.value = data
        return data
      })
    }
    return loading
  }

  return { config, load }
}
