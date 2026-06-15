<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NInput,
  NSwitch,
  useDialog,
  useMessage,
} from 'naive-ui'
import { renderCarbonIcon } from '@/utils/carbon-icon'
import { useAuthStore } from '@/stores/auth'
import {
  changePassword,
  getActiveSessions,
  getQuickLoginUrl,
  removeActiveSession,
  resetSecurity,
  updateUser,
  type ActiveSession,
} from '@/api/profile'
import { fetchTelegramBotInfo, unbindTelegram } from '@/api/telegram'
import { useUserCommConfig } from '@/composables/useUserCommConfig'
import { useCurrency } from '@/composables/useCurrency'
import { useI18n } from '@/i18n'
import { resolveApiError } from '@/lib/api-errors'

const WalletIcon = renderCarbonIcon(
  'M216 64H56a8 8 0 0 1 0-16h136a8 8 0 0 0 0-16H56a24 24 0 0 0-24 24v128a24 24 0 0 0 24 24h160a16 16 0 0 0 16-16V80a16 16 0 0 0-16-16m-36 80a12 12 0 1 1 12-12a12 12 0 0 1-12 12',
  '0 0 256 256',
  'inline',
)

const auth = useAuthStore()
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const remindExpire = ref(true)
const remindTraffic = ref(true)
const msg = useMessage()
const { t, locale } = useI18n()
const { config: commConfig, load: loadComm } = useUserCommConfig()
const { code: currency, load: loadCurrency } = useCurrency()
const telegramBotError = ref(false)
const botUsername = ref('')
const sessions = ref<ActiveSession[]>([])
const sessionsLoading = ref(false)
const quickLoginLoading = ref(false)
const dialog = useDialog()

const switchStyle = {
  '--n-button-border-radius': '3px',
  '--n-rail-border-radius': '3px',
  '--n-rail-color-active': '#316C72FF',
} as const

async function submitPassword() {
  if (newPassword.value.length < 8) {
    msg.error(t('errors.passwordTooShort'))
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    msg.error(t('passwordMismatch'))
    return
  }
  try {
    await changePassword({ old_password: oldPassword.value, new_password: newPassword.value })
    msg.success(t('common.success'))
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
  }
}

async function reset() {
  dialog.warning({
    title: t('profile.resetSubscribe'),
    content: t('profile.resetConfirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      try {
        const url = await resetSecurity()
        if (url) {
          dialog.success({
            title: t('profile.resetSubscribe'),
            content: t('profile.resetSuccessWithUrl', { url }),
            positiveText: t('common.confirm'),
          })
        } else {
          msg.success(t('common.success'))
        }
      } catch (e: unknown) {
        msg.error(resolveApiError(e, t))
      }
    },
  })
}

async function saveNotify() {
  const prevExpire = remindExpire.value
  const prevTraffic = remindTraffic.value
  try {
    await updateUser({
      remind_expire: remindExpire.value ? 1 : 0,
      remind_traffic: remindTraffic.value ? 1 : 0,
    })
    msg.success(t('common.success'))
    await auth.loadUser()
  } catch (e: unknown) {
    remindExpire.value = Boolean(auth.user?.remind_expire ?? prevExpire)
    remindTraffic.value = Boolean(auth.user?.remind_traffic ?? prevTraffic)
    msg.error(resolveApiError(e, t))
  }
}

async function unbindTg() {
  dialog.warning({
    title: t('profile.telegramUnbind'),
    content: t('profile.telegramUnbindConfirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      try {
        await unbindTelegram()
        await auth.loadUser()
        msg.success(t('common.success'))
      } catch (e: unknown) {
        msg.error(resolveApiError(e, t))
      }
    },
  })
}

async function loadSessions() {
  sessionsLoading.value = true
  try {
    sessions.value = await getActiveSessions()
  } catch (e: unknown) {
    sessions.value = []
    msg.error(resolveApiError(e, t))
  } finally {
    sessionsLoading.value = false
  }
}

function formatTime(value: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString(locale.value)
}

function kickSession(row: ActiveSession) {
  dialog.warning({
    title: t('profile.kickSession'),
    content: t('profile.kickSessionConfirm', { device: row.name || `#${row.id}` }),
    positiveText: t('profile.kickSession'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      try {
        await removeActiveSession(String(row.id))
        msg.success(t('common.success'))
        await loadSessions()
      } catch (e: unknown) {
        msg.error(resolveApiError(e, t))
      }
    },
  })
}

async function generateQuickLogin() {
  quickLoginLoading.value = true
  try {
    const url = await getQuickLoginUrl()
    await navigator.clipboard.writeText(url)
    msg.success(t('profile.quickLoginCopied'))
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
  } finally {
    quickLoginLoading.value = false
  }
}

const sessionColumns = [
  { title: () => t('profile.sessionDevice'), key: 'name' },
  {
    title: () => t('profile.sessionCreated'),
    key: 'created_at',
    render: (row: ActiveSession) => formatTime(row.created_at),
  },
  {
    title: () => t('profile.sessionLastUsed'),
    key: 'last_used_at',
    render: (row: ActiveSession) => formatTime(row.last_used_at),
  },
  {
    title: () => t('common.actions'),
    key: 'actions',
    render: (row: ActiveSession) =>
      h(
        NButton,
        { size: 'small', type: 'error', tertiary: true, onClick: () => kickSession(row) },
        { default: () => t('profile.kickSession') },
      ),
  },
]

onMounted(async () => {
  await auth.loadUser()
  remindExpire.value = Boolean(auth.user?.remind_expire ?? 1)
  remindTraffic.value = Boolean(auth.user?.remind_traffic ?? 1)
  try {
    await Promise.all([loadComm(), loadCurrency()])
    const cfg = commConfig.value
    if (cfg?.is_telegram) {
      try {
        const bot = await fetchTelegramBotInfo()
        botUsername.value = bot.username
        telegramBotError.value = false
      } catch (e: unknown) {
        botUsername.value = ''
        telegramBotError.value = true
        msg.error(resolveApiError(e, t, t('errors.requestFailed')))
      }
    }
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t, t('errors.requestFailed')))
  }
  await loadSessions()
})
</script>

<template>
  <n-card :title="t('profile.wallet')" class="rounded-md">
    <template #header-extra>
      <WalletIcon class="text-4xl text-gray-500" />
    </template>
    <div>
      <span class="text-5xl font-normal">{{ ((auth.user?.balance ?? 0) / 100).toFixed(2) }}</span>
      <span class="ml-2.5 text-xl text-gray-500 md:ml-5">{{ currency }}</span>
    </div>
    <div class="text-gray-500">{{ t('profile.balanceHint') }}</div>
  </n-card>

  <n-card :title="t('profile.changePassword')" class="mt-5 rounded-md">
    <div class="mt-2.5 max-w-125">
      <label>{{ t('profile.oldPassword') }}</label>
      <n-input v-model:value="oldPassword" type="password" :placeholder="t('profile.oldPasswordPh')" show-password-on="click" />
    </div>
    <div class="mt-2.5 max-w-125">
      <label>{{ t('profile.newPassword') }}</label>
      <n-input v-model:value="newPassword" type="password" :placeholder="t('profile.newPasswordPh')" show-password-on="click" />
    </div>
    <div class="mt-2.5 max-w-125">
      <label>{{ t('profile.confirmNewPassword') }}</label>
      <n-input v-model:value="confirmPassword" type="password" :placeholder="t('profile.newPasswordPh')" show-password-on="click" />
    </div>
    <n-button type="primary" class="mt-5" @click="submitPassword">{{ t('common.save') }}</n-button>
  </n-card>

  <n-card :title="t('profile.notify')" class="mt-5 rounded-md">
    <div class="mt-2.5 max-w-125">
      <div class="mb-1">{{ t('profile.remindExpire') }}</div>
      <n-switch v-model:value="remindExpire" :style="switchStyle" @update:value="saveNotify" />
    </div>
    <div class="mt-2.5 max-w-125">
      <div class="mb-1">{{ t('profile.remindTraffic') }}</div>
      <n-switch v-model:value="remindTraffic" :style="switchStyle" @update:value="saveNotify" />
    </div>
  </n-card>

  <n-card v-if="commConfig?.is_telegram" :title="t('profile.telegram')" class="mt-5 rounded-md">
    <p v-if="auth.user?.telegram_id" class="text-gray-500">{{ t('profile.telegramBound') }}</p>
    <n-button
      v-if="auth.user?.telegram_id"
      type="error"
      tertiary
      size="small"
      class="mt-2"
      @click="unbindTg"
    >
      {{ t('profile.telegramUnbind') }}
    </n-button>
    <template v-else-if="telegramBotError">
      <n-alert type="warning" :bordered="false">{{ t('profile.telegramBotUnavailable') }}</n-alert>
    </template>
    <template v-else-if="botUsername">
      <p class="text-gray-500">{{ t('profile.telegramHint') }}</p>
      <a :href="`https://t.me/${botUsername}`" target="_blank" rel="noopener" class="tg-link">@{{ botUsername }}</a>
    </template>
    <a
      v-if="commConfig?.telegram_discuss_link"
      :href="commConfig.telegram_discuss_link"
      target="_blank"
      rel="noopener"
      class="tg-link mt-2 block"
    >
      {{ t('profile.telegramGroup') }}
    </a>
  </n-card>

  <n-card :title="t('profile.activeSessions')" class="mt-5 rounded-md">
    <n-data-table
      :columns="sessionColumns"
      :data="sessions"
      :loading="sessionsLoading"
      :bordered="false"
      size="small"
    />
    <p v-if="!sessionsLoading && sessions.length === 0" class="text-gray-500">{{ t('profile.noSessions') }}</p>
  </n-card>

  <n-card :title="t('profile.quickLogin')" class="mt-5 rounded-md">
    <p class="text-gray-500">{{ t('profile.quickLoginHint') }}</p>
    <n-button
      type="primary"
      size="small"
      class="mt-2.5"
      :loading="quickLoginLoading"
      @click="generateQuickLogin"
    >
      {{ t('profile.generateQuickLogin') }}
    </n-button>
  </n-card>

  <n-card :title="t('profile.resetSubscribe')" class="mt-5 rounded-md">
    <n-alert type="warning" :show-icon="true">
      {{ t('profile.resetDesc') }}
    </n-alert>
    <n-button type="error" size="small" class="mt-2.5" @click="reset">{{ t('common.reset') }}</n-button>
  </n-card>
</template>

<style scoped>
.tg-link {
  color: var(--xb-link);
  text-decoration: none;
}
.tg-link:hover {
  text-decoration: underline;
}
.text-gray-500 {
  color: var(--xb-text-secondary);
}
.text-4xl {
  color: var(--xb-text-secondary);
}
.mt-2 {
  margin-top: 8px;
}
.block {
  display: block;
}
</style>
