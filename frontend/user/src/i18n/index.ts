import { ref, computed } from 'vue'
import { getSettings } from '@/utils/settings'
import enUS from './locales/en-US'
import zhCN from './locales/zh-CN'

const catalogs: Record<string, Record<string, unknown>> = {
  'en-US': enUS,
  'zh-CN': zhCN,
}

const locale = ref('en-US')

export function initLocale() {
  const langs = getSettings().i18n ?? ['en-US']
  const saved = localStorage.getItem('xboard_locale')
  if (saved && langs.includes(saved)) {
    locale.value = saved
    return
  }
  locale.value = langs.includes('en-US') ? 'en-US' : langs[0]
}

export function setLocale(code: string) {
  locale.value = code
  localStorage.setItem('xboard_locale', code)
}

export function useI18n() {
  const t = (key: string): string => {
    const parts = key.split('.')
    let cur: unknown = catalogs[locale.value] ?? enUS
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in (cur as object)) {
        cur = (cur as Record<string, unknown>)[p]
      } else {
        return key
      }
    }
    return typeof cur === 'string' ? cur : key
  }
  return { t, locale: computed(() => locale.value), setLocale }
}
