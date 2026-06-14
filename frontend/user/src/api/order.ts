import { api, request } from '@/api'
import { cacheTryOutPlanId } from '@/api/comm'

export interface OrderItem {
  trade_no: string
  plan_id: number
  period: string
  total_amount: number
  status: number
  payment_id?: number | null
  created_at: number
  plan?: { name: string }
}

export function canCancelOrder(row: OrderItem) {
  return row.status === 0 && (row.payment_id == null || row.payment_id === 0)
}

export async function fetchOrders() {
  return request<OrderItem[]>(api.get('/user/order/fetch'))
}

export async function saveOrder(payload: { plan_id: number; period: string; coupon_code?: string }) {
  return request<string>(api.post('/user/order/save', payload))
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

export interface PaymentMethod {
  id: number
  name: string
  payment: string
  icon?: string
  handling_fee_fixed?: number
  handling_fee_percent?: number
}

export interface OrderDetail extends OrderItem {
  balance_amount?: number
  handling_amount?: number | null
  payment_id?: number | null
  surplus_orders?: OrderItem[]
  try_out_plan_id?: number
  payment?: PaymentMethod | null
}

export async function fetchOrderDetail(tradeNo: string) {
  const detail = await request<OrderDetail>(api.get('/user/order/detail', { params: { trade_no: tradeNo } }))
  if (detail.try_out_plan_id != null) {
    cacheTryOutPlanId(detail.try_out_plan_id)
  }
  return detail
}

export async function fetchPaymentMethods() {
  return request<PaymentMethod[]>(api.get('/user/order/getPaymentMethod'))
}

export async function checkOrderStatus(tradeNo: string) {
  return request<number>(api.get('/user/order/check', { params: { trade_no: tradeNo } }))
}

export async function checkoutOrderWithMethod(tradeNo: string, method: number, token?: string) {
  const { data } = await api.post<{
    status?: string
    type?: number
    data?: string | boolean
    message?: string
  }>('/user/order/checkout', { trade_no: tradeNo, method, token })
  if (data.status === 'success' && data.data !== undefined) {
    return { type: data.type ?? 0, data: data.data }
  }
  if (data.type !== undefined && data.data !== undefined) {
    return { type: data.type, data: data.data }
  }
  throw new Error(data.message || 'Checkout failed')
}
