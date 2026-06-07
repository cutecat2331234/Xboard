import { api, request } from '@/api'

export interface InviteStat {
  codes: { code: string; pv: number; status: number }[]
  stat: number[]
}

export async function fetchInvite() {
  return request<InviteStat>(api.get('/user/invite/fetch'))
}

export async function generateInviteCode() {
  return request<null>(api.get('/user/invite/save'))
}

export async function fetchInviteDetails() {
  return request<unknown[]>(api.get('/user/invite/details'))
}
