export type Settings = {
  base_url?: string
  title?: string
  description?: string
  version?: string
  logo?: string
  secure_path?: string
}

export function getSettings(): Settings {
  return (window as unknown as { settings?: Settings }).settings ?? {}
}

export function getAdminApiPrefix(): string {
  const sp = getSettings().secure_path || 'admin'
  return `/api/v2/${sp}`
}

export function getPassportApiPrefix(): string {
  return '/api/v2/passport'
}

export function apiBase(): string {
  return getAdminApiPrefix()
}
