import { api } from '@/api'

export interface NoticeItem {
  id: number
  title: string
  content: string
  created_at: number
}

/** Backend returns `{ data, total }` without `status: success`. */
export async function fetchNotices(): Promise<NoticeItem[]> {
  const { data } = await api.get<{ data?: NoticeItem[]; total?: number; status?: string }>(
    '/user/notice/fetch',
  )
  if (data.status === 'success' && Array.isArray(data.data)) {
    return data.data
  }
  if (Array.isArray(data.data)) {
    return data.data
  }
  return []
}
