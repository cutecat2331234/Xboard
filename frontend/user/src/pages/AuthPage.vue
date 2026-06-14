<script setup lang="ts">
import { ref, computed, h, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NCard,
  NInput,
  NButton,
  NIcon,
  NDivider,
  NCheckbox,
  NDropdown,
  useMessage,
} from 'naive-ui'
import type { DropdownOption } from 'naive-ui'
import { LanguageOutline, PersonAddOutline } from '@vicons/ionicons5'
import { getSettings } from '@/utils/settings'
import { useAuthPageStyle } from '@/composables/useAuthPageStyle'
import { useGuestConfig } from '@/composables/useGuestConfig'
import { useAuthEmail } from '@/composables/useAuthEmail'
import { LANG_LABELS } from '@/lib/lang-labels'
import { sendEmailVerify } from '@/api/comm'
import AuthEmailInput from '@/components/AuthEmailInput.vue'
import CaptchaWidget from '@/components/CaptchaWidget.vue'
import TelegramLoginWidget from '@/components/TelegramLoginWidget.vue'
import { forgetPassword, loginWithMailLink, token2Login } from '@/api/auth'
import { resolveLoginRedirect, useAuthStore } from '@/stores/auth'
import { useI18n } from '@/i18n'
import { resolveApiError } from '@/lib/api-errors'
import { resolveAssetUrl } from '@/lib/asset-url'
import { storeInviteCode } from '@/api/pv'

const LoginIcon = {
  render() {
    return h('svg', { class: 'inline-block', viewBox: '0 0 32 32', width: '1em', height: '1em' }, [
      h('path', {
        fill: 'currentColor',
        d: 'M26 30H14a2 2 0 0 1-2-2v-3h2v3h12V4H14v3h-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v24a2 2 0 0 1-2 2',
      }),
      h('path', {
        fill: 'currentColor',
        d: 'M14.59 20.59L18.17 17H4v-2h14.17l-3.58-3.59L16 10l6 6l-6 6z',
      }),
    ])
  },
}

const route = useRoute()
const router = useRouter()
const msg = useMessage()
const auth = useAuthStore()
const { t, setLocale } = useI18n()
const settings = computed(() => getSettings())
const authPageStyle = useAuthPageStyle()
const { config, load: loadGuest } = useGuestConfig()
const { emailLocal, emailFull, emailSuffix, resolvedEmail } = useAuthEmail(config)

const isForget = computed(() => route.query.tab === 'forget')
const isRegister = computed(
  () => route.query.tab === 'register' || route.meta?.authTab === 'register',
)
const isLogin = computed(() => !isRegister.value && !isForget.value)

function openForgetTab() {
  router.push({ path: '/forgetpassword', query: route.query })
}

function backToLoginTab() {
  router.push({ path: '/login', query: route.query })
}

const langOptions = computed<DropdownOption[]>(() => {
  const langs = settings.value.i18n ?? ['zh-CN', 'en-US']
  return langs.map((code) => ({ key: code, label: LANG_LABELS[code] ?? code }))
})

const captchaRef = ref<InstanceType<typeof CaptchaWidget> | null>(null)
const password = ref('')
const confirmPassword = ref('')
const inviteCode = ref('')
const emailCode = ref('')
const lockInvite = ref(false)
const agreed = ref(false)
const errorText = ref('')
const sending = ref(false)
const tokenLoading = ref(false)
const mailLinkMode = ref(false)
const mailLinkLoading = ref(false)
const forgetLoading = ref(false)

const showMailLink = computed(() => Boolean(config.value?.login_with_mail_link_enable))
const registerClosed = computed(() => Number(config.value?.register_enable) === 0)
const brandLogo = computed(() =>
  resolveAssetUrl(config.value?.logo || settings.value.logo || '', config.value?.app_url),
)
const telegramAuthUrl = computed(() => {
  const domain = config.value?.telegram_login_domain
  if (!domain) return undefined
  const resolved = resolveAssetUrl(domain, config.value?.app_url)
  return resolved || undefined
})
const showTelegram = computed(
  () => Boolean(config.value?.telegram_login_enable && config.value?.telegram_bot_username),
)
const showCaptcha = computed(() => Boolean(config.value?.is_captcha) && !isRegister.value)
const showTerms = computed(() => Boolean(config.value?.tos_url))
const showEmailVerify = computed(() => Boolean(config.value?.is_email_verify))
const inviteRequired = computed(() => Boolean(config.value?.is_invite_force))
const inviteVisible = computed(() => config.value?.invite_enable !== 0)

const pageTitle = computed(() => {
  if (isForget.value) return t('forgotPassword')
  return settings.value.title || config.value?.app_name || t('auth.defaultTitle')
})

const pageSubtitle = computed(() => {
  return settings.value.description || config.value?.app_description || t('auth.defaultDescription')
})

function applyInviteFromQuery() {
  const code = route.query.code
  if (typeof code === 'string' && code) {
    inviteCode.value = code
    lockInvite.value = true
    storeInviteCode(code)
  }
}

async function tryTokenLogin() {
  const verify = route.query.verify
  if (typeof verify !== 'string' || !verify || isRegister.value || isForget.value) return
  tokenLoading.value = true
  try {
    await token2Login(verify)
    await auth.loadUser()
    router.replace(resolveLoginRedirect(route.query.redirect))
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
  } finally {
    tokenLoading.value = false
  }
}

onMounted(async () => {
  await loadGuest()
  if (registerClosed.value && isRegister.value) {
    msg.warning(t('errors.registrationClosed'))
    backToLoginTab()
  }
  applyInviteFromQuery()
  await tryTokenLogin()
})

watch(
  () => [route.path, route.query.tab] as const,
  () => {
    errorText.value = ''
    mailLinkMode.value = false
    password.value = ''
    confirmPassword.value = ''
    emailCode.value = ''
    applyInviteFromQuery()
    if (registerClosed.value && isRegister.value) {
      msg.warning(t('errors.registrationClosed'))
      backToLoginTab()
      return
    }
    if (!isRegister.value && !isForget.value) tryTokenLogin()
  },
)

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
    msg.error(resolveApiError(e, t))
    captchaRef.value?.reset()
  } finally {
    sending.value = false
  }
}

async function submitMailLink() {
  errorText.value = ''
  const addr = resolvedEmail()
  if (!addr) return
  mailLinkLoading.value = true
  try {
    await loginWithMailLink(addr)
    msg.success(t('mailLinkSent'))
  } catch (e: unknown) {
    const message = resolveApiError(e, t)
    errorText.value = message
    msg.error(message)
  } finally {
    mailLinkLoading.value = false
  }
}

async function submitLogin() {
  errorText.value = ''
  try {
    const captcha = await captchaRef.value?.getPayload()
    await auth.login({ email: resolvedEmail(), password: password.value, ...captcha })
    msg.success(t('login'))
    router.push(resolveLoginRedirect(route.query.redirect))
  } catch (e: unknown) {
    const message = resolveApiError(e, t, t('auth.loginFailed'))
    errorText.value = message
    msg.error(message)
    captchaRef.value?.reset()
  }
}

async function submitRegister() {
  errorText.value = ''
  if (showTerms.value && !agreed.value) {
    errorText.value = t('termsRequired')
    return
  }
  if (password.value !== confirmPassword.value) {
    errorText.value = t('passwordMismatch')
    return
  }
  if (password.value.length < 8) {
    errorText.value = t('errors.passwordTooShort')
    return
  }
  if (inviteRequired.value && !inviteCode.value.trim()) {
    errorText.value = t('inviteCodeRequired')
    return
  }
  try {
    const captcha = await captchaRef.value?.getPayload()
    await auth.register({
      email: resolvedEmail(),
      password: password.value,
      invite_code: inviteCode.value || undefined,
      email_code: showEmailVerify.value ? emailCode.value : undefined,
      ...captcha,
    })
    msg.success(t('register'))
    router.push('/dashboard')
  } catch (e: unknown) {
    const message = resolveApiError(e, t, t('auth.registerFailed'))
    errorText.value = message
    msg.error(message)
    captchaRef.value?.reset()
  }
}

async function submitForget() {
  errorText.value = ''
  if (password.value !== confirmPassword.value) {
    errorText.value = t('passwordMismatch')
    return
  }
  if (password.value.length < 8) {
    errorText.value = t('errors.passwordTooShort')
    return
  }
  forgetLoading.value = true
  try {
    const captcha = await captchaRef.value?.getPayload()
    await forgetPassword({
      email: resolvedEmail(),
      password: password.value,
      email_code: emailCode.value,
      ...captcha,
    })
    msg.success(t('common.success'))
    password.value = ''
    confirmPassword.value = ''
    emailCode.value = ''
    backToLoginTab()
  } catch (e: unknown) {
    const message = resolveApiError(e, t)
    errorText.value = message
    msg.error(message)
    captchaRef.value?.reset()
  } finally {
    forgetLoading.value = false
  }
}

function submit() {
  if (isForget.value) submitForget()
  else if (isRegister.value) submitRegister()
  else if (mailLinkMode.value) submitMailLink()
  else submitLogin()
}
</script>

<template>
  <div class="auth-page" :style="authPageStyle">
    <n-card class="auth-card" :bordered="true">
      <div class="auth-card__body p-6">
        <img v-if="brandLogo" :src="brandLogo" alt="" class="auth-card__logo" />
        <h1 class="auth-card__title-main">
          {{ pageTitle }}
        </h1>
        <h5 class="auth-card__subtitle">{{ pageSubtitle }}</h5>

        <form v-if="!tokenLoading" @submit.prevent="submit">
          <div class="auth-field">
            <AuthEmailInput
              v-model:local="emailLocal"
              v-model:full="emailFull"
              v-model:suffix="emailSuffix"
              :suffixes="config?.email_whitelist_suffix"
              autofocus
            />
          </div>

          <div
            v-if="(isRegister && showEmailVerify) || isForget"
            class="auth-field auth-field--row"
          >
            <n-input v-model:value="emailCode" :placeholder="t('emailCode')" />
            <n-button :loading="sending" @click.prevent="sendCode">{{ t('sendCode') }}</n-button>
          </div>

          <div v-if="!mailLinkMode || isForget" class="auth-field">
            <n-input
              v-model:value="password"
              type="password"
              :placeholder="t('password')"
              show-password-on="click"
            />
          </div>

          <template v-if="isForget">
            <div class="auth-field">
              <n-input
                v-model:value="confirmPassword"
                type="password"
                :placeholder="t('confirmPassword')"
                show-password-on="click"
              />
            </div>
            <div v-if="showCaptcha" class="auth-field">
              <CaptchaWidget ref="captchaRef" :config="config" />
            </div>
          </template>

          <template v-else-if="isRegister">
            <div class="auth-field">
              <n-input
                v-model:value="confirmPassword"
                type="password"
                :placeholder="t('confirmPassword')"
                show-password-on="click"
              />
            </div>

            <div v-if="inviteVisible" class="auth-field">
              <n-input
                v-model:value="inviteCode"
                :placeholder="inviteRequired ? t('inviteCodeRequiredPh') : t('inviteCode')"
                :disabled="lockInvite"
              />
            </div>

            <div v-if="config?.is_captcha" class="auth-field">
              <CaptchaWidget ref="captchaRef" :config="config" />
            </div>

            <div v-if="showTerms" class="auth-field auth-terms">
              <n-checkbox v-model:checked="agreed">
                {{ t('termsPrefix') }}
                <a :href="config?.tos_url" target="_blank" rel="noopener" class="auth-terms-link">
                  {{ t('termsLink') }}
                </a>
              </n-checkbox>
            </div>
          </template>

          <div v-else-if="showCaptcha && !mailLinkMode" class="auth-field">
            <CaptchaWidget ref="captchaRef" :config="config" />
          </div>

          <p v-if="errorText" class="auth-error">{{ errorText }}</p>

          <div class="auth-field">
            <n-button
              type="primary"
              attr-type="submit"
              block
              :loading="
                isForget
                  ? forgetLoading
                  : isRegister
                    ? auth.loading
                    : mailLinkMode
                      ? mailLinkLoading
                      : auth.loading
              "
              class="auth-submit"
            >
              <template v-if="!mailLinkMode && !isForget" #icon>
                <n-icon :size="16">
                  <component :is="isRegister ? PersonAddOutline : LoginIcon" />
                </n-icon>
              </template>
              {{
                isForget
                  ? t('resetPassword')
                  : isRegister
                    ? t('register')
                    : mailLinkMode
                      ? t('mailLinkSend')
                      : t('login')
              }}
            </n-button>
          </div>

          <TelegramLoginWidget
            v-if="showTelegram && config?.telegram_bot_username && !mailLinkMode && !isForget"
            :bot-username="config.telegram_bot_username"
            :auth-url="telegramAuthUrl"
          />
        </form>

        <p v-else class="auth-loading">{{ t('common.loading') }}</p>
      </div>

      <div
        v-if="!tokenLoading"
        class="auth-card__footer-bar flex justify-between px-6 py-4 text-gray-500"
      >
        <div v-if="isForget || isRegister" class="auth-footer-left">
          <router-link class="auth-footer-link" to="/login">{{ t('backToLogin') }}</router-link>
        </div>
        <div v-else class="auth-footer-left">
          <template v-if="mailLinkMode">
            <a href="#" class="auth-footer-link" @click.prevent="mailLinkMode = false">
              {{ t('backToPasswordLogin') }}
            </a>
          </template>
          <template v-else>
            <router-link v-if="!registerClosed" class="auth-footer-link text-gray-500" to="/register">{{ t('register') }}</router-link>
            <n-divider v-if="!registerClosed" vertical />
            <router-link class="auth-footer-link text-gray-500" to="/forgetpassword">{{ t('forgotPassword') }}</router-link>
            <template v-if="showMailLink">
              <n-divider vertical />
              <a href="#" class="auth-footer-link" @click.prevent="mailLinkMode = true">
                {{ t('mailLinkLogin') }}
              </a>
            </template>
          </template>
        </div>

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
.auth-card__body form {
  margin: 0;
}
.auth-card__logo {
  display: block;
  max-height: 48px;
  max-width: 160px;
  margin: 0 auto 12px;
  object-fit: contain;
}
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
.auth-footer-link.text-gray-500 {
  color: var(--xb-text-secondary);
}
.auth-field {
  margin-top: 20px;
  width: 100%;
}
.auth-field--row {
  display: flex;
  gap: 8px;
}
.auth-field--row .n-input {
  flex: 1;
}
.auth-terms {
  margin-top: 20px;
}
.auth-terms :deep(.n-checkbox__label) {
  font-size: 14px;
}
.auth-terms-link {
  color: var(--xb-primary);
  text-decoration: none;
}
.auth-terms-link:hover {
  text-decoration: underline;
}
.auth-error {
  margin: 20px 0 0;
  color: #d03050;
  font-size: 13px;
}
.auth-loading {
  margin: 24px 0;
  text-align: center;
  color: #6b7280;
}
.auth-submit {
  height: 36px;
}
.auth-submit :deep(.n-button__content) {
  font-size: 14px;
}
.auth-card__footer-bar {
  align-items: center;
  background-color: var(--n-color-embedded, rgb(250, 250, 252));
  border-radius: 0 0 6px 6px;
}
.auth-footer-left {
  display: flex;
  align-items: center;
  white-space: nowrap;
}
.auth-footer-left :deep(.n-divider--vertical) {
  margin: 0 8px;
  height: 16px;
}
.auth-footer-link {
  color: var(--xb-text-secondary);
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
}
.auth-footer-link:hover {
  color: var(--xb-text);
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
