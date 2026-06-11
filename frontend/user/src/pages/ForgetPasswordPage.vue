<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NCard, NInput, NButton, NIcon, NDivider, NDropdown, useMessage } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import { LanguageOutline } from '@vicons/ionicons5'
import { getSettings } from '@/utils/settings'
import { useAuthPageStyle } from '@/composables/useAuthPageStyle'
import { forgetPassword } from '@/api/auth'
import { sendEmailVerify } from '@/api/comm'
import { useGuestConfig } from '@/composables/useGuestConfig'
import { useAuthEmail } from '@/composables/useAuthEmail'
import { LANG_LABELS } from '@/lib/lang-labels'
import CaptchaWidget from '@/components/CaptchaWidget.vue'
import AuthEmailInput from '@/components/AuthEmailInput.vue'
import { useI18n } from '@/i18n'

const router = useRouter()
const msg = useMessage()
const { t, setLocale } = useI18n()
const settings = computed(() => getSettings())
const authPageStyle = useAuthPageStyle()
const { config, load } = useGuestConfig()
const captchaRef = ref<InstanceType<typeof CaptchaWidget> | null>(null)

const langOptions = computed<DropdownOption[]>(() => {
  const langs = settings.value.i18n ?? ['zh-CN', 'en-US']
  return langs.map((code) => ({ key: code, label: LANG_LABELS[code] ?? code }))
})

const { emailLocal, emailFull, emailSuffix, resolvedEmail } = useAuthEmail(config)
const password = ref('')
const confirmPassword = ref('')
const emailCode = ref('')
const sending = ref(false)
const loading = ref(false)
const errorText = ref('')

onMounted(load)

async function sendCode() {
  const addr = resolvedEmail()
  if (!addr) return
  sending.value = true
  try {
    const captcha = await captchaRef.value?.getPayload()
    await sendEmailVerify(addr, captcha)
    msg.success(t('common.success'))
    captchaRef.value?.reset()
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : t('common.error'))
    captchaRef.value?.reset()
  } finally {
    sending.value = false
  }
}

async function submit() {
  errorText.value = ''
  if (password.value !== confirmPassword.value) {
    errorText.value = t('passwordMismatch')
    return
  }
  loading.value = true
  try {
    const captcha = await captchaRef.value?.getPayload()
    await forgetPassword({
      email: resolvedEmail(),
      password: password.value,
      email_code: emailCode.value,
      ...captcha,
    })
    msg.success(t('common.success'))
    router.push('/login')
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('common.error')
    errorText.value = message
    msg.error(message)
    captchaRef.value?.reset()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page" :style="authPageStyle">
    <n-card class="auth-card" :bordered="true">
      <div class="auth-card__body">
        <h1 class="auth-card__title-main">{{ t('forgotPassword') }}</h1>
        <h5 class="auth-card__subtitle">{{ settings.description || 'Xboard' }}</h5>
        <form @submit.prevent="submit">
          <div class="auth-field">
            <AuthEmailInput
              v-model:local="emailLocal"
              v-model:full="emailFull"
              v-model:suffix="emailSuffix"
              :suffixes="config?.email_whitelist_suffix"
              autofocus
            />
          </div>
          <div class="auth-field auth-field--row">
            <n-input v-model:value="emailCode" :placeholder="t('emailCode')" />
            <n-button :loading="sending" @click.prevent="sendCode">{{ t('sendCode') }}</n-button>
          </div>
          <div class="auth-field">
            <n-input v-model:value="password" type="password" :placeholder="t('password')" show-password-on="click" />
          </div>
          <div class="auth-field">
            <n-input
              v-model:value="confirmPassword"
              type="password"
              :placeholder="t('confirmPassword')"
              show-password-on="click"
            />
          </div>
          <CaptchaWidget ref="captchaRef" :config="config" />
          <p v-if="errorText" class="auth-error">{{ errorText }}</p>
          <div class="auth-field">
            <n-button type="primary" attr-type="submit" block :loading="loading" class="auth-submit">
              {{ t('resetPassword') }}
            </n-button>
          </div>
        </form>
      </div>

      <div class="auth-card__footer-bar">
        <router-link to="/login" class="auth-footer-link">{{ t('backToLogin') }}</router-link>
        <n-dropdown :options="langOptions" trigger="click" @select="(k: string) => setLocale(k)">
          <n-button class="auth-lang-btn" quaternary>
            <template #icon>
              <n-icon><LanguageOutline /></n-icon>
            </template>
            {{ t('common.language') }}
          </n-button>
        </n-dropdown>
      </div>
    </n-card>
  </div>
</template>

<style scoped>
.auth-card__body { padding: 24px; }
.auth-card__body form { margin: 0; }
.auth-card__title-main {
  margin: 24.12px 0;
  text-align: center;
  font-size: 36px;
  font-weight: 400;
  line-height: 40px;
  color: #343a40;
}
.auth-card__subtitle {
  margin: 23.38px 0 0;
  text-align: center;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #6c757d;
}
.auth-field { margin-top: 20px; width: 100%; }
.auth-field--row { display: flex; gap: 8px; }
.auth-field--row .n-input { flex: 1; }
.auth-error { margin: 20px 0 0; color: #d03050; font-size: 13px; }
.auth-submit { height: 36px; }
.auth-card__footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgb(250, 250, 252);
  color: #6b7280;
}
.auth-footer-link {
  color: #6b7280;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
}
.auth-lang-btn {
  height: 30px;
  padding: 0 !important;
}
.auth-lang-btn :deep(.n-button__content) {
  font-size: 14px;
  color: #6b7280;
}
</style>
