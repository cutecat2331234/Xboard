import { api, request } from '@/api'
import { cacheTryOutPlanId } from '@/api/comm'

export interface OrderItem {
  trade_no: string
  plan_id: number
  period: string
  total_amount: number
  status: number
  type?: number
  payment_id?: number | null
  created_at: number
  paid_at?: number | null
  plan?: { name: string }
}

export function canCancelOrder(row: OrderItem) {
  if (Number(row.status) === 0 && !row.paid_at) {
    return true
  }
  return Number(row.status) === 1 && !row.paid_at
}

export async function fetchOrders(params?: {
  status?: number
  page?: number
  pageSize?: number
}) {
  const query: Record<string, number> = {
    current: params?.page ?? 1,
    page_size: params?.pageSize ?? 20,
  }
  if (params?.status !== undefined && params.status !== null) {
    query.status = params.status
  }
  return request<{
    data: OrderItem[]
    total: number
    current_page: number
    page_size: number
  }>(api.get('/user/order/fetch', { params: query }))
}

export async function fetchFirstBlockingOrder(): Promise<OrderItem | null> {
  for (const status of [0, 1]) {
    const res = await fetchOrders({ status, page: 1, pageSize: 1 })
    if (res.data[0]) return res.data[0]
  }
  return null
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
    return { type: data.type ?? 0, data: data.data }
  }
  if (data.type !== undefined && data.data !== undefined) {
    return { type: data.type, data: data.data }
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
