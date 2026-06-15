import { api } from '@/api'

const INVITE_CODE_KEY = 'xboard_invite_code'

export function storeInviteCode(code: string) {
  const trimmed = code.trim()
  if (trimmed) {
    sessionStorage.setItem(INVITE_CODE_KEY, trimmed)
  }
}

function readCodeFromSearch(search: string): string {
  if (!search) return ''
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return params.get('code')?.trim() ?? ''
}

export function resolveInviteCodeFromUrl(): string {
  let code = readCodeFromSearch(window.location.search)
  if (!code && window.location.hash.includes('?')) {
    const hashQuery = window.location.hash.split('?')[1] ?? ''
    code = readCodeFromSearch('?' + hashQuery)
  }
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
