import { api, request } from '@/api'

export interface KnowledgeItem {
  id: number
  title: string
  body: string
  category: string
  updated_at: number
}

export async function fetchKnowledge() {
  return request<KnowledgeItem[]>(api.get('/user/knowledge/fetch'))
}

export async function fetchKnowledgeCategories() {
  return request<string[]>(api.get('/user/knowledge/getCategory'))
}
