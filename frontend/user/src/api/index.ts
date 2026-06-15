import axios from 'axios'
import type { ApiResponse } from '@/types/settings'
import { getRouterBase } from '@/utils/settings'
import { shouldForceLogoutOn403 } from '@/lib/auth-forbidden'
import { invalidateSessionCache } from '@/lib/session-cache'
import { invalidateAppConfigCaches } from '@/lib/invalidate-app-config'

const AUTH_STORAGE_KEY = 'xboard_auth_data'

export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const authData = localStorage.getItem(AUTH_STORAGE_KEY)
  if (authData) {
    config.headers.Authorization = authData
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const message = error.response?.data?.message
      if (shouldForceLogoutOn403(message)) {
        clearAuthData()
        invalidateSessionCache()
        invalidateAppConfigCaches()
        const loginPath = `${getRouterBase()}#/login`
        if (!window.location.hash.includes('/login')) {
          window.location.href = loginPath
        }
      }
    }
    return Promise.reject(error)
  },
)

export function saveAuthData(authData: string) {
  localStorage.setItem(AUTH_STORAGE_KEY, authData)
}

export function clearAuthData() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function getAuthData(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEY)
}

export async function request<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise
  if (data.status !== 'success') {
    throw new Error(data.message || 'Request failed')
  }
  return data.data
}
