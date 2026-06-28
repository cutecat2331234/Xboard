import { clearAuthData, fetchDashboardStats, getAuthData } from '@/lib/api'
import {
  getAdminSessionCache,
  invalidateAdminSessionCache,
  setAdminSessionCache,
} from '@/lib/session-cache'

/** Why a session check resolved the way it did. Lets callers decide whether to
 *  drop the stored token (genuine auth failure) or keep it (transient blip). */
export type AdminSessionReason = 'valid' | 'unauthorized' | 'transient' | 'unknown' | 'no-token'

export interface AdminSessionResult {
  valid: boolean
  reason: AdminSessionReason
}

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

export async function ensureAdminSession(): Promise<AdminSessionResult> {
  if (!getAuthData()) {
    invalidateAdminSessionCache()
    return { valid: false, reason: 'no-token' }
  }

  const { lastSessionCheckAt, lastSessionValid, SESSION_CHECK_TTL_MS } = getAdminSessionCache()
  const now = Date.now()
  if (now - lastSessionCheckAt < SESSION_CHECK_TTL_MS) {
    return { valid: lastSessionValid, reason: lastSessionValid ? 'valid' : 'transient' }
  }

  try {
    await fetchDashboardStats()
    setAdminSessionCache(true, now)
    return { valid: true, reason: 'valid' }
  } catch (error) {
    // Genuine auth failure: the admin middleware answers 403 {"message":"Unauthorized"},
    // which api.ts already turns into a cleared token (getAuthData() === null) before
    // throwing an Error with message 'Unauthorized'. Either signal means "unauthorized".
    const tokenWasCleared = !getAuthData()
    if (tokenWasCleared || isAuthSessionError(error)) {
      clearAuthData()
      invalidateAdminSessionCache()
      return { valid: false, reason: 'unauthorized' }
    }
    // Transient / unknown error: keep the stored token, fall back to the cached verdict.
    // Both cases behave identically here (the original code merged them — never drop a
    // valid token); we only label the reason differently for caller clarity / logging.
    setAdminSessionCache(lastSessionValid, now)
    return {
      valid: lastSessionValid,
      reason: isTransientSessionError(error) ? 'transient' : 'unknown',
    }
  }
}
