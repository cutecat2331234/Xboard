import { ref, computed } from 'vue'

import { getSettings } from '@/utils/settings'

import enUS from './locales/en-US'

import zhCN from './locales/zh-CN'

import jaJP from './locales/ja-JP'

import koKR from './locales/ko-KR'

import viVN from './locales/vi-VN'

import zhTW from './locales/zh-TW'

import faIR from './locales/fa-IR'



const catalogs: Record<string, Record<string, unknown>> = {

  'en-US': enUS,

  'zh-CN': zhCN,

  'ja-JP': jaJP,

  'ko-KR': koKR,

  'vi-VN': viVN,

  'zh-TW': zhTW,

  'fa-IR': faIR,

}



const locale = ref('en-US')



export function initLocale() {

  const langs = getSettings().i18n ?? ['en-US']

  const saved = localStorage.getItem('xboard_locale')

  if (saved && langs.includes(saved)) {

    locale.value = saved

    return

  }

  locale.value = langs.includes('zh-CN') ? 'zh-CN' : langs[0]

}



export function setLocale(code: string) {

  locale.value = code

  localStorage.setItem('xboard_locale', code)

}



export function useI18n() {

  const t = (key: string, params?: Record<string, string | number>): string => {

    const parts = key.split('.')

    let cur: unknown = catalogs[locale.value] ?? enUS

    for (const p of parts) {

      if (cur && typeof cur === 'object' && p in (cur as object)) {

        cur = (cur as Record<string, unknown>)[p]

      } else {

        cur = enUS

        for (const p2 of parts) {

          if (cur && typeof cur === 'object' && p2 in (cur as object)) {

            cur = (cur as Record<string, unknown>)[p2]

          } else {

            return key

          }

        }

        break

      }

    }

    let result = typeof cur === 'string' ? cur : key

    if (params) {

      for (const [k, v] of Object.entries(params)) {

        result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))

      }

    }

    return result

  }

  return { t, locale: computed(() => locale.value), setLocale }

}


