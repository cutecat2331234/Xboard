<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NLoadingBarProvider,
  darkTheme,
} from 'naive-ui'
import { themeOverrides } from '@/theme/naiveTheme'
import { initLocale, useI18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { recordPageView } from '@/api/pv'

initLocale()
const auth = useAuthStore()
const { naiveLocale, naiveDateLocale } = useI18n()

const isDark = ref(document.documentElement.classList.contains('dark'))
let observer: MutationObserver | undefined

onMounted(() => {
  recordPageView()
  auth.checkSession()
  observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
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
    :theme-overrides="themeOverrides"
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
