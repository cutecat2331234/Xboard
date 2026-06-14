import { resetCommCaches } from '@/api/comm'
import { useCurrency } from '@/composables/useCurrency'
import { useGuestConfig } from '@/composables/useGuestConfig'
import { useUserCommConfig } from '@/composables/useUserCommConfig'

/** Clear cached guest/user comm config so feature flags and currency refresh. */
export function invalidateAppConfigCaches(): void {
  useUserCommConfig().reset()
  useGuestConfig().reset()
  useCurrency().reset()
  resetCommCaches()
}
