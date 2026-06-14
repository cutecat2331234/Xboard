import { clearAuthData, fetchDashboardStats, getAuthData } from '@/lib/api'
import {
  getAdminSessionCache,
  invalidateAdminSessionCache,
  setAdminSessionCache,
} from '@/lib/session-cache'

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
  } catch {
    clearAuthData()
    invalidateAdminSessionCache()
    return false
  }
}
