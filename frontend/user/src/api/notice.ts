import { api, request } from '@/api'

export interface NoticeItem {
  id: number
  title: string
  content: string
  created_at: number
}

export async function fetchNotices() {
  return request<NoticeItem[]>(api.get('/user/notice/fetch'))
}
