import { api, request } from '@/api'

export interface PlanItem {
  id: number
  name: string
  content?: string
  transfer_enable: number
  month_price: number | null
  quarter_price: number | null
  half_year_price: number | null
  year_price: number | null
  onetime_price: number | null
  reset_price: number | null
  show: number
}

export async function fetchPlans() {
  return request<PlanItem[]>(api.get('/user/plan/fetch'))
}
