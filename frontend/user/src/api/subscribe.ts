import { api, request } from '@/api'

export interface SubscribeInfo {
  subscribe_url: string
  reset_day: number
  plan: { name: string; transfer_enable: number } | null
  token: string
}

export async function fetchSubscribe() {
  return request<SubscribeInfo>(api.get('/user/getSubscribe'))
}
