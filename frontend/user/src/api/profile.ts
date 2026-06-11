import { api, request } from '@/api'

export async function changePassword(payload: { old_password: string; new_password: string }) {
  return request<null>(api.post('/user/changePassword', payload))
}

export async function updateUser(payload: Record<string, unknown>) {
  return request<null>(api.post('/user/update', payload))
}

export async function resetSecurity() {
  return request<null>(api.get('/user/resetSecurity'))
}

export async function getActiveSessions() {
  return request<unknown[]>(api.get('/user/getActiveSession'))
}

export async function removeActiveSession(sessionId: string) {
  return request<null>(api.post('/user/removeActiveSession', { session_id: sessionId }))
}

export async function getQuickLoginUrl() {
  return request<string>(api.post('/user/getQuickLoginUrl'))
}
