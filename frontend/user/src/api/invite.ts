import { api, request } from '@/api'

export interface InviteCode {
  code: string
  pv: number
  status: number
  created_at?: number
}

export interface InviteStat {
  codes: InviteCode[]
  stat: number[]
}

export async function fetchInvite() {
  return request<InviteStat>(api.get('/user/invite/fetch'))
}

export async function generateInviteCode() {
  return request<null>(api.get('/user/invite/save'))
}

export async function transferCommission(transfer_amount: number) {
  return request<null>(api.post('/user/transfer', { transfer_amount }))
}

export async function withdrawCommission(payload: { withdraw_method: string; withdraw_account: string }) {
  return request<null>(api.post('/user/ticket/withdraw', payload))
}

export async function fetchInviteDetails() {
  return request<{ data?: Array<{ created_at?: number; get_amount?: number }> }>(
    api.get('/user/invite/details'),
  )
}
