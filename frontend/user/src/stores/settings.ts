import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { WindowSettings } from '@/utils/settings'
import { getSettings } from '@/utils/settings'
import { isThemeDark } from '@/lib/theme'
import { getThemeOverrides } from '@/theme/naiveTheme'

export const useSettingsStore = defineStore('settings', () => {
  const settings = computed<WindowSettings>(() => getSettings())
  const themeOverrides = computed(() => getThemeOverrides(settings.value.theme?.color))
  const isDarkTheme = computed(() => isThemeDark(settings.value.theme?.color))

  return {
    settings,
    themeOverrides,
    isDarkTheme,
  }
})
