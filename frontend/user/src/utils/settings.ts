export type WindowSettings = {
  title?: string
  assets_path?: string
  theme?: { color?: string }
  version?: string
  background_url?: string
  description?: string
  logo?: string
}

export function getSettings(): WindowSettings {
  return (window as unknown as { settings?: WindowSettings }).settings ?? {}
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
