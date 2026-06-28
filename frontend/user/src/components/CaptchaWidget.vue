<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { GuestConfig, CaptchaPayload } from '@/api/comm'

const props = defineProps<{
  config: GuestConfig | null
}>()

const containerId = `captcha-${Math.random().toString(36).slice(2)}`
const ready = ref(false)
let widgetId: number | string | null = null
/** Identifies the widget instance already rendered, to avoid double-render
 *  (re-rendering the same container throws for reCAPTCHA v2 / duplicates Turnstile). */
let renderedKey: string | null = null

function configKey(): string | null {
  const c = props.config
  if (!c?.is_captcha) return null
  const type = c.captcha_type || 'recaptcha'
  if (type === 'turnstile') return c.turnstile_site_key ? `turnstile:${c.turnstile_site_key}` : null
  if (type === 'recaptcha') return c.recaptcha_site_key ? `recaptcha:${c.recaptcha_site_key}` : null
  if (type === 'recaptcha-v3') return c.recaptcha_v3_site_key ? `recaptcha-v3:${c.recaptcha_v3_site_key}` : null
  return null
}

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

async function mountWidget() {
  const key = configKey()
  // Already rendered (or rendering) for this exact captcha config — keep it.
  if (key && key === renderedKey) return
  ready.value = false
  if (!props.config?.is_captcha || !key) {
    renderedKey = null
    return
  }
  // Claim the key synchronously so a concurrent call can't render a second widget.
  renderedKey = key

  const type = props.config.captcha_type || 'recaptcha'

  if (type === 'turnstile' && props.config.turnstile_site_key) {
    await loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js', 'cf-turnstile')
    const turnstile = (window as unknown as { turnstile?: { render: (el: string, opts: Record<string, unknown>) => string } }).turnstile
    if (turnstile) {
      widgetId = turnstile.render(`#${containerId}`, {
        sitekey: props.config.turnstile_site_key,
        theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      })
      ready.value = true
    } else {
      renderedKey = null
    }
    return
  }

  if (type === 'recaptcha' && props.config.recaptcha_site_key) {
    await loadScript('https://www.google.com/recaptcha/api.js?render=explicit', 'google-recaptcha')
    const grecaptcha = (window as unknown as { grecaptcha?: { render: (el: string, opts: Record<string, unknown>) => number } }).grecaptcha
    if (grecaptcha) {
      widgetId = grecaptcha.render(containerId, {
        sitekey: props.config.recaptcha_site_key,
      })
      ready.value = true
    } else {
      renderedKey = null
    }
    return
  }

  if (type === 'recaptcha-v3' && props.config.recaptcha_v3_site_key) {
    await loadScript(`https://www.google.com/recaptcha/api.js?render=${props.config.recaptcha_v3_site_key}`, 'google-recaptcha-v3')
    const grecaptcha = (window as unknown as { grecaptcha?: { ready: (cb: () => void) => void } }).grecaptcha
    if (grecaptcha) {
      await new Promise<void>((resolve) => grecaptcha.ready(() => resolve()))
      ready.value = true
    } else {
      renderedKey = null
    }
  }
}

async function getPayload(): Promise<CaptchaPayload> {
  if (!props.config?.is_captcha) return {}

  const type = props.config.captcha_type || 'recaptcha'

  if (type === 'turnstile') {
    const turnstile = (window as unknown as { turnstile?: { getResponse: (id?: string) => string } }).turnstile
    return { turnstile_token: turnstile?.getResponse(widgetId as string) || undefined }
  }

  if (type === 'recaptcha') {
    const grecaptcha = (window as unknown as { grecaptcha?: { getResponse: (id?: number) => string } }).grecaptcha
    return { recaptcha_data: grecaptcha?.getResponse(widgetId as number) || undefined }
  }

  if (type === 'recaptcha-v3' && props.config.recaptcha_v3_site_key) {
    const grecaptcha = (window as unknown as {
      grecaptcha?: { execute: (key: string, opts: { action: string }) => Promise<string> }
    }).grecaptcha
    if (!ready.value || !grecaptcha) {
      return { skip_recaptcha_v3: true }
    }
    try {
      const token = await grecaptcha.execute(props.config.recaptcha_v3_site_key, { action: 'submit' })
      if (!token) return { skip_recaptcha_v3: true }
      return { recaptcha_v3_token: token }
    } catch {
      return { skip_recaptcha_v3_error: true }
    }
  }

  return {}
}

function reset() {
  const type = props.config?.captcha_type || 'recaptcha'
  if (type === 'turnstile') {
    const turnstile = (window as unknown as { turnstile?: { reset: (id?: string) => void } }).turnstile
    turnstile?.reset(widgetId as string)
  } else if (type === 'recaptcha') {
    const grecaptcha = (window as unknown as { grecaptcha?: { reset: (id?: number) => void } }).grecaptcha
    grecaptcha?.reset(widgetId as number)
  }
}

onMounted(mountWidget)
watch(() => props.config, mountWidget)
onBeforeUnmount(() => {
  widgetId = null
  renderedKey = null
})

defineExpose({ getPayload, reset })
</script>

<template>
  <div v-if="config?.is_captcha" class="captcha-wrap">
    <div :id="containerId" />
  </div>
</template>

<style scoped>
.captcha-wrap {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>
