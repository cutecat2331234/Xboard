import { api, request } from '@/api'

export interface TicketItem {
  id: number
  subject: string
  level: number
  status: number
  reply_status?: number
  created_at?: number
  updated_at: number
  message?: { id: number; message: string; created_at: number; is_me: boolean }[]
}

export async function fetchTickets(page = 1, pageSize = 20) {
  return request<{
    data: TicketItem[]
    total: number
    current_page: number
    page_size: number
  }>(api.get('/user/ticket/fetch', { params: { current: page, page_size: pageSize } }))
}

export async function fetchTicketById(id: number) {
  return request<TicketItem>(api.get('/user/ticket/fetch', { params: { id } }))
}

export async function saveTicket(payload: { subject: string; level: number; message: string }) {
  return request<null>(api.post('/user/ticket/save', payload))
}

export async function replyTicket(payload: { id: number; message: string }) {
  return request<null>(api.post('/user/ticket/reply', payload))
}

export async function closeTicket(id: number) {
  return request<null>(api.post('/user/ticket/close', { id }))
}
