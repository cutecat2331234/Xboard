<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { telegramLogin } from '@/api/auth'
import { resolveLoginRedirect, useAuthStore } from '@/stores/auth'
import { invalidateAppConfigCaches } from '@/lib/invalidate-app-config'
import { useI18n } from '@/i18n'
import { resolveApiError } from '@/lib/api-errors'

const props = defineProps<{
  botUsername: string
  authUrl?: string
}>()

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const msg = useMessage()
const { t } = useI18n()

const CONTAINER_ID = 'telegram-login-container'

function loadScript(): Promise<void> {
  if (document.getElementById('telegram-widget-script')) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = 'telegram-widget-script'
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Telegram script'))
    document.head.appendChild(script)
  })
}

async function handleAuth(user: Record<string, unknown>) {
  try {
    await telegramLogin(user)
    invalidateAppConfigCaches()
    await auth.loadUser()
    msg.success(t('login'))
    router.push(resolveLoginRedirect(route.query.redirect))
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
  }
}

onMounted(async () => {
  ;(window as unknown as { handleTelegramAuth?: typeof handleAuth }).handleTelegramAuth = handleAuth
  try {
    await loadScript()
    const container = document.getElementById(CONTAINER_ID)
    if (!container) return
    container.innerHTML = ''
    const widget = document.createElement('script')
    widget.async = true
    widget.src = 'https://telegram.org/js/telegram-widget.js?22'
    widget.setAttribute('data-telegram-login', props.botUsername)
    widget.setAttribute('data-size', 'large')
    widget.setAttribute('data-radius', '8')
    if (props.authUrl) {
      widget.setAttribute('data-auth-url', props.authUrl)
    } else {
      widget.setAttribute('data-onauth', 'handleTelegramAuth(user)')
    }
    widget.setAttribute('data-request-access', 'write')
    container.appendChild(widget)
  } catch {
    /* widget optional when plugin disabled or script blocked */
  }
})
</script>

<template>
  <div class="telegram-login">
    <div class="telegram-login__divider">
      <span class="telegram-login__line" />
      <span class="telegram-login__label">{{ t('auth.or') }}</span>
      <span class="telegram-login__line" />
    </div>
    <div :id="CONTAINER_ID" class="telegram-login__widget" />
  </div>
</template>

<style scoped>
.telegram-login {
  margin-top: 16px;
  width: 100%;
}
.telegram-login__divider {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}
.telegram-login__line {
  flex: 1;
  height: 1px;
  background: #d1d5db;
}
.telegram-login__label {
  font-size: 14px;
  color: #6b7280;
  white-space: nowrap;
}
.telegram-login__widget {
  display: flex;
  justify-content: center;
  width: 100%;
}
</style>
