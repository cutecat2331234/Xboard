import { api, request } from '@/api'

export interface TrafficLogItem {
  u: number
  d: number
  record_at: number
}

export async function fetchTrafficLog() {
  return request<TrafficLogItem[]>(api.get('/user/stat/getTrafficLog'))
}
