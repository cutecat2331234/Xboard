import { api, request } from '@/api'

export interface OrderItem {
  trade_no: string
  plan_id: number
  period: string
  total_amount: number
  status: number
  created_at: number
  plan?: { name: string }
}

export async function fetchOrders() {
  return request<OrderItem[]>(api.get('/user/order/fetch'))
}

export async function saveOrder(payload: { plan_id: number; period: string; coupon_code?: string }) {
  return request<{ trade_no: string }>(api.post('/user/order/save', payload))
}

export async function checkoutOrder(tradeNo: string) {
  const { data } = await api.post<{
    status?: string
    type?: number
    data?: string | boolean
    message?: string
  }>('/user/order/checkout', { trade_no: tradeNo })
  if (data.status === 'success' && data.data !== undefined) {
    return { type: data.type ?? 0, data: String(data.data) }
  }
  if (data.type !== undefined && data.data !== undefined) {
    return { type: data.type, data: String(data.data) }
  }
  throw new Error(data.message || 'Checkout failed')
}

export async function cancelOrder(tradeNo: string) {
  return request<null>(api.post('/user/order/cancel', { trade_no: tradeNo }))
}
