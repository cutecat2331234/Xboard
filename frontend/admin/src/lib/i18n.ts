import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

declare global {
  interface Window {
    XBOARD_TRANSLATIONS?: Record<string, Record<string, unknown>>
  }
}

function buildResources() {
  const dict = window.XBOARD_TRANSLATIONS ?? {}
  const resources: Record<string, { translation: Record<string, unknown> }> = {}
  for (const [lng, translation] of Object.entries(dict)) {
    resources[lng] = { translation }
  }
  if (!resources['en-US']) {
    resources['en-US'] = { translation: {} }
  }
  return resources
}

const LOCALE_KEY = 'xboard_admin_locale'

export function initI18n() {
  const saved =
    localStorage.getItem(LOCALE_KEY) || localStorage.getItem('i18nextLng') || 'en-US'
  const resources = buildResources()

  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources,
      lng: saved,
      fallbackLng: 'en-US',
      keySeparator: '.',
      nsSeparator: false,
      interpolation: { escapeValue: false },
      returnNull: false,
      returnEmptyString: false,
      react: {
        useSuspense: false,
        bindI18n: 'languageChanged loaded',
        bindI18nStore: 'added removed',
      },
    })
  } else {
    for (const [lng, data] of Object.entries(resources)) {
      i18n.addResourceBundle(lng, 'translation', data.translation, true, true)
    }
    void i18n.changeLanguage(saved)
  }
}

export function setLocale(code: string) {
  localStorage.setItem(LOCALE_KEY, code)
  localStorage.setItem('i18nextLng', code)
  void i18n.changeLanguage(code)
}

export function getLocale() {
  return i18n.language || 'en-US'
}

export { i18n }
