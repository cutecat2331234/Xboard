import { defineStore } from 'pinia'
import { computed } from 'vue'
import type { WindowSettings } from '@/utils/settings'
import { getSettings, getThemeOverrides } from '@/utils/settings'

export const useSettingsStore = defineStore('settings', () => {
  const settings = computed<WindowSettings>(() => getSettings())
  const themeOverrides = computed(() => getThemeOverrides(settings.value.theme?.color))
  const isDarkTheme = computed(() => settings.value.theme?.color === 'black')

  return {
    settings,
    themeOverrides,
    isDarkTheme,
  }
})
