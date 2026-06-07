type Dict = Record<string, unknown>

declare global {
  interface Window {
    XBOARD_TRANSLATIONS?: Record<string, Dict>
  }
}

let locale = 'en-US'

export function initI18n() {
  const saved = localStorage.getItem('xboard_admin_locale')
  locale = saved || 'en-US'
}

export function setLocale(code: string) {
  locale = code
  localStorage.setItem('xboard_admin_locale', code)
}

function getDict(): Dict {
  return window.XBOARD_TRANSLATIONS?.[locale] ?? window.XBOARD_TRANSLATIONS?.['en-US'] ?? {}
}

export function t(key: string): string {
  const parts = key.split('.')
  let cur: unknown = getDict()
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as object)) {
      cur = (cur as Dict)[p]
    } else {
      return key
    }
  }
  return typeof cur === 'string' ? cur : key
}
