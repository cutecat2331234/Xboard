<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLoadingBarProvider,
  darkTheme,
} from 'naive-ui'
import { initLocale, useI18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { recordPageView } from '@/api/pv'

initLocale()
const auth = useAuthStore()
const settings = useSettingsStore()
const { naiveLocale, naiveDateLocale } = useI18n()

const prefersDark = ref(document.documentElement.classList.contains('dark'))
let observer: MutationObserver | undefined

const isDark = computed(() => settings.isDarkTheme || prefersDark.value)

onMounted(() => {
  recordPageView()
  auth.checkSession()
  observer = new MutationObserver(() => {
    prefersDark.value = document.documentElement.classList.contains('dark')
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <n-config-provider
    :theme="isDark ? darkTheme : undefined"
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
    :theme-overrides="settings.themeOverrides"
  >
    <n-loading-bar-provider>
      <n-message-provider>
        <n-dialog-provider>
          <router-view />
        </n-dialog-provider>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>
