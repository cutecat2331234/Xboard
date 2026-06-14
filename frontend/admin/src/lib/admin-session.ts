import { clearAuthData, fetchDashboardStats, getAuthData } from '@/lib/api'
import {
  getAdminSessionCache,
  invalidateAdminSessionCache,
  setAdminSessionCache,
} from '@/lib/session-cache'

function isTransientSessionError(error: unknown): boolean {
  if (error instanceof TypeError) return true
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')
  }
  return false
}

function isAuthSessionError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unauthorized'
}

export async function ensureAdminSession(): Promise<boolean> {
  if (!getAuthData()) {
    invalidateAdminSessionCache()
    return false
  }

  const { lastSessionCheckAt, lastSessionValid, SESSION_CHECK_TTL_MS } = getAdminSessionCache()
  const now = Date.now()
  if (now - lastSessionCheckAt < SESSION_CHECK_TTL_MS) {
    return lastSessionValid
  }

  try {
    await fetchDashboardStats()
    setAdminSessionCache(true, now)
    return true
  } catch (error) {
    if (!getAuthData()) {
      invalidateAdminSessionCache()
      return false
    }
    if (isAuthSessionError(error)) {
      clearAuthData()
      invalidateAdminSessionCache()
      return false
    }
    if (isTransientSessionError(error)) {
      setAdminSessionCache(lastSessionValid, now)
      return lastSessionValid
    }
    setAdminSessionCache(lastSessionValid, now)
    return lastSessionValid
  }
}
