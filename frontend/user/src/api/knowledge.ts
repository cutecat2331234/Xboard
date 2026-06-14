import { api, request } from '@/api'

export interface KnowledgeItem {
  id: number
  title: string
  body: string
  category: string
  updated_at: number
}

type GroupedKnowledge = Record<string, KnowledgeItem[]>

function flattenKnowledge(data: KnowledgeItem[] | GroupedKnowledge): KnowledgeItem[] {
  if (Array.isArray(data)) return data
  return Object.values(data).flat()
}

export async function fetchKnowledge(language?: string) {
  const params = language ? { language } : undefined
  const data = await request<KnowledgeItem[] | GroupedKnowledge>(
    api.get('/user/knowledge/fetch', { params }),
  )
  return flattenKnowledge(data)
}

export async function fetchKnowledgeCategories(language?: string) {
  const params = language ? { language } : undefined
  return request<string[]>(api.get('/user/knowledge/getCategory', { params }))
}
