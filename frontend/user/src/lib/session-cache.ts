const SESSION_CHECK_TTL_MS = 30_000
let lastSessionCheckAt = 0
let lastSessionValid = false

export function getSessionCache() {
  return { lastSessionCheckAt, lastSessionValid, SESSION_CHECK_TTL_MS }
}

export function setSessionCache(valid: boolean, checkedAt = Date.now()) {
  lastSessionValid = valid
  lastSessionCheckAt = checkedAt
}

export function invalidateSessionCache() {
  lastSessionCheckAt = 0
  lastSessionValid = false
}
