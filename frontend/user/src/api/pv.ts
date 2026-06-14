import { api } from '@/api'

const INVITE_CODE_KEY = 'xboard_invite_code'

export function storeInviteCode(code: string) {
  const trimmed = code.trim()
  if (trimmed) {
    sessionStorage.setItem(INVITE_CODE_KEY, trimmed)
  }
}

export function resolveInviteCodeFromUrl(): string {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')?.trim() ?? ''
  if (code) {
    storeInviteCode(code)
  }
  return code || sessionStorage.getItem(INVITE_CODE_KEY) || ''
}

export function recordPageView() {
  const inviteCode = resolveInviteCodeFromUrl()
  if (!inviteCode) return
  api.post('/passport/comm/pv', { invite_code: inviteCode }).catch(() => {})
}
