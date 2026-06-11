<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NInput,
  NSwitch,
  useMessage,
} from 'naive-ui'
import { renderCarbonIcon } from '@/utils/carbon-icon'
import { useAuthStore } from '@/stores/auth'
import {
  changePassword,
  resetSecurity,
  updateUser,
} from '@/api/profile'
import { fetchTelegramBotInfo } from '@/api/telegram'
import { useUserCommConfig } from '@/composables/useUserCommConfig'
import { useI18n } from '@/i18n'

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
const { t } = useI18n()
const { config: commConfig, load: loadComm } = useUserCommConfig()
const botUsername = ref('')
const currency = ref('CNY')

const switchStyle = {
  '--n-button-border-radius': '3px',
  '--n-rail-border-radius': '3px',
  '--n-rail-color-active': '#316C72FF',
} as const

async function submitPassword() {
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
    msg.error(e instanceof Error ? e.message : t('common.error'))
  }
}

async function reset() {
  try {
    await resetSecurity()
    msg.success(t('common.success'))
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : t('common.error'))
  }
}

async function saveNotify() {
  try {
    await updateUser({
      remind_expire: remindExpire.value ? 1 : 0,
      remind_traffic: remindTraffic.value ? 1 : 0,
    })
  } catch {
    /* ignore */
  }
}

onMounted(async () => {
  await auth.loadUser()
  remindExpire.value = Boolean(auth.user?.remind_expire ?? 1)
  remindTraffic.value = Boolean(auth.user?.remind_traffic ?? 1)
  const cfg = await loadComm()
  currency.value = cfg.currency ?? 'CNY'
  if (cfg.is_telegram) {
    try {
      const bot = await fetchTelegramBotInfo()
      botUsername.value = bot.username
    } catch {
      botUsername.value = ''
    }
  }
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

  <n-card :title="t('profile.resetSubscribe')" class="mt-5 rounded-md">
    <n-alert type="warning" :show-icon="true">
      {{ t('profile.resetDesc') }}
    </n-alert>
    <n-button type="error" size="small" class="mt-2.5" @click="reset">{{ t('common.reset') }}</n-button>
  </n-card>
</template>

<style scoped>
.tg-link {
  color: #2080f0;
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
