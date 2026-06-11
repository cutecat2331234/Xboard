import { ref, watch } from 'vue'
import type { GuestConfig } from '@/api/comm'
import { defaultEmailSuffix, isEmailWhitelistEnabled } from '@/lib/email-address'

export function useAuthEmail(config: { value: GuestConfig | null }) {
  const emailLocal = ref('')
  const emailFull = ref('')
  const emailSuffix = ref('')

  function applyWhitelist(cfg: GuestConfig | null) {
    if (isEmailWhitelistEnabled(cfg?.email_whitelist_suffix)) {
      emailSuffix.value = defaultEmailSuffix(cfg.email_whitelist_suffix)
    } else {
      emailSuffix.value = ''
    }
  }

  watch(
    () => config.value,
    (cfg) => applyWhitelist(cfg),
    { immediate: true },
  )

  function resolvedEmail(): string {
    if (emailSuffix.value) return `${emailLocal.value.trim()}${emailSuffix.value}`
    return emailFull.value.trim()
  }

  return { emailLocal, emailFull, emailSuffix, resolvedEmail, applyWhitelist }
}
