const SESSION_CHECK_TTL_MS = 30_000
let lastSessionCheckAt = 0
let lastSessionValid = false

export function getAdminSessionCache() {
  return { lastSessionCheckAt, lastSessionValid, SESSION_CHECK_TTL_MS }
}

export function setAdminSessionCache(valid: boolean, checkedAt = Date.now()) {
  lastSessionValid = valid
  lastSessionCheckAt = checkedAt
}

export function invalidateAdminSessionCache() {
  lastSessionCheckAt = 0
  lastSessionValid = false
}
