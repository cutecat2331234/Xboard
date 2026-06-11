import { api, request } from '@/api'

export interface CouponInfo {
  id: number
  name: string
  code: string
  type: number
  value: number
}

export async function checkCoupon(payload: { code: string; plan_id: number; period: string }) {
  return request<CouponInfo>(api.post('/user/coupon/check', payload))
}
