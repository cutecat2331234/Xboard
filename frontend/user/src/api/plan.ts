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
  two_year_price?: number | null
  three_year_price?: number | null
  onetime_price: number | null
  reset_price: number | null
  capacity_limit?: number | string | null
  show?: boolean | number
  sell?: boolean
  renew?: boolean
  tags?: string[]
}

export async function fetchPlans() {
  return request<PlanItem[]>(api.get('/user/plan/fetch'))
}

export async function fetchPlanById(id: number) {
  return request<PlanItem>(api.get('/user/plan/fetch', { params: { id } }))
}

export const PERIOD_OPTIONS = [
  { key: 'month_price', labelKey: 'plan.periodMonth' },
  { key: 'quarter_price', labelKey: 'plan.periodQuarter' },
  { key: 'half_year_price', labelKey: 'plan.periodHalfYear' },
  { key: 'year_price', labelKey: 'plan.periodYear' },
  { key: 'two_year_price', labelKey: 'plan.periodTwoYear' },
  { key: 'three_year_price', labelKey: 'plan.periodThreeYear' },
  { key: 'onetime_price', labelKey: 'plan.periodOnetime' },
  { key: 'reset_price', labelKey: 'plan.periodReset' },
] as const
