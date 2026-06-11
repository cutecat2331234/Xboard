import { computed } from 'vue'
import { getSettings } from '@/utils/settings'

export function useAuthPageStyle() {
  return computed(() => {
    const url = getSettings().background_url?.trim()
    if (!url) return {}
    return {
      backgroundImage: `url(${url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  })
}
