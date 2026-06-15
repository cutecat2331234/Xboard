import type { ApiResponse } from '@/types/settings'

export function resolveApiFailureMessage(payload: ApiResponse<unknown>, fallback: string): string {
  if (payload.message?.trim()) {
    return payload.message.trim()
  }
  if (payload.error && typeof payload.error === 'object') {
    const details = Object.values(payload.error)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => String(value).trim())
      .filter(Boolean)
    if (details.length > 0) {
      return details[0]
    }
  }
  return fallback
}
