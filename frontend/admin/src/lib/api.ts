import { getAdminApiPrefix, getPassportApiPrefix } from '@/lib/settings'

const AUTH_STORAGE_KEY = 'xboard_auth_data'

export interface ApiResponse<T = unknown> {
  status?: string
  data?: T
  message?: string
}

export function getAuthData(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEY)
}

export function setAuthData(authData: string): void {
  localStorage.setItem(AUTH_STORAGE_KEY, authData)
}

export function clearAuthData(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Accept', 'application/json')

  const auth = getAuthData()
  if (auth) {
    headers.set('Authorization', auth)
  }

  const response = await fetch(url, { ...options, headers })
  if (response.status === 403) {
    clearAuthData()
    window.location.hash = '#/sign-in'
  }
  if (!response.ok) {
    let message = response.statusText
    try {
      const payload = (await response.json()) as ApiResponse
      message = payload.message ?? message
    } catch {
      // ignore
    }
    throw new Error(message || 'Request failed')
  }
  return response.json() as Promise<T>
}

export function adminApi<T>(path: string, options?: RequestInit): Promise<T> {
  const prefix = getAdminApiPrefix()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return request<T>(`${prefix}${normalized}`, options)
}

export function passportApi<T>(path: string, options?: RequestInit): Promise<T> {
  const prefix = getPassportApiPrefix()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return request<T>(`${prefix}${normalized}`, options)
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthPayload {
  token: string
  is_admin?: boolean
  auth_data: string
}

export async function login(payload: LoginPayload): Promise<AuthPayload> {
  const result = await passportApi<ApiResponse<AuthPayload>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (result.status !== 'success' || !result.data?.auth_data) {
    throw new Error(result.message ?? 'Login failed')
  }
  setAuthData(result.data.auth_data)
  return result.data
}

export async function fetchJsonList(path: string): Promise<unknown[]> {
  const result = await adminApi<ApiResponse<unknown[]> | unknown[]>(path)
  if (Array.isArray(result)) return result
  return (result as ApiResponse<unknown[]>).data ?? []
}

export async function fetchJsonObject<T>(path: string): Promise<T> {
  const result = await adminApi<ApiResponse<T>>(path)
  return result.data ?? ({} as T)
}

export interface DashboardOverride {
  online_nodes?: number
  online_users?: number
  online_devices?: number
  today_traffic?: { total?: number }
  month_traffic?: { total?: number }
}

export async function fetchDashboardStats(): Promise<DashboardOverride> {
  const result = await adminApi<ApiResponse<DashboardOverride>>('/stat/getOverride')
  return result.data ?? {}
}
