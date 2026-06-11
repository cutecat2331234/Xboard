export type WindowSettings = {
  title?: string
  assets_path?: string
  theme?: { color?: string }
  version?: string
  background_url?: string
  description?: string
  logo?: string
  i18n?: string[]
  /** Notice tag substrings that trigger the dashboard popup modal */
  notice_popup_tags?: string[]
}

export function getSettings(): WindowSettings {
  return (window as unknown as { settings?: WindowSettings }).settings ?? {}
}

export function resolvePopupNoticeTags(i18nTags: string[]): string[] {
  const fromSettings = getSettings().notice_popup_tags
  if (Array.isArray(fromSettings) && fromSettings.length > 0) return fromSettings
  return i18nTags
}

export function getRouterBase(): string {
  return (window as unknown as { routerBase?: string }).routerBase ?? '/'
}

export function getThemeOverrides(color?: string) {
  if (color === 'black') {
    return { common: { primaryColor: '#18a058' } }
  }
  return { common: { primaryColor: '#2080f0' } }
}
