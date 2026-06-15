import { api } from '@/api'

export interface NoticeItem {
  id: number
  title: string
  content: string
  img_url?: string | null
  tags?: string[]
  created_at: number
}

/** Fetch all notice pages for dashboard carousel / popup scan. */
export async function fetchNotices(pageSize = 50): Promise<NoticeItem[]> {
  const all: NoticeItem[] = []
  let page = 1
  let total = Number.POSITIVE_INFINITY
  while (all.length < total) {
    const { data } = await api.get<{
      data?: NoticeItem[] | { data?: NoticeItem[]; total?: number }
      total?: number
      status?: string
    }>(
      '/user/notice/fetch',
      { params: { current: page, pageSize } },
    )
    const payload = data.status === 'success' ? data.data : data
    const batch = Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && Array.isArray(payload.data)
        ? payload.data
        : []
    total =
      typeof payload === 'object' && payload && !Array.isArray(payload) && typeof payload.total === 'number'
        ? payload.total
        : typeof data.total === 'number'
          ? data.total
          : batch.length
    if (!batch.length) break
    all.push(...batch)
    if (batch.length < pageSize) break
    page += 1
  }
  return all
}
