/** Resolve panel-relative asset URLs (e.g. /images/logo.png) against guest app_url. */
export function resolveAssetUrl(url: string | undefined | null, baseUrl?: string | null): string {
  const raw = (url ?? '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw
  }
  const base = (baseUrl ?? '').trim().replace(/\/+$/, '')
  if (!base) return raw
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`
}
