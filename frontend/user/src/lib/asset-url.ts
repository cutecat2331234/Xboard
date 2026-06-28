/**
 * Return a URL only if it uses a safe external scheme (http/https/mailto/tg).
 * Blocks `javascript:`, `data:`, and other script-capable schemes that would
 * execute when bound to an `<a href>` or passed to `window.open`.
 * Returns undefined for unsafe or empty input so callers can omit the attribute.
 */
export function safeExternalUrl(url: string | undefined | null): string | undefined {
  const raw = (url ?? '').trim()
  if (!raw) return undefined
  // Protocol-relative (//host) and absolute paths (/path) are safe (same-origin nav).
  if (raw.startsWith('//') || raw.startsWith('/')) return raw
  if (/^(https?:|mailto:|tg:)/i.test(raw)) return raw
  // Reject anything else with an explicit scheme (e.g. javascript:, data:, vbscript:).
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return undefined
  // Schemeless relative value — safe.
  return raw
}

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
