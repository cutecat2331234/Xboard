import { api, request } from '@/api'

export interface GiftCardRewards {
  balance?: number
  transfer_enable?: number
  expire_days?: number
  device_limit?: number
  reset_package?: boolean
  plan_id?: number
  plan_validity_days?: number
  invite_reward_rate?: number
  [key: string]: unknown
}

export interface GiftCardTemplateInfo {
  name: string
  description?: string
  type: number
  type_name: string
  icon?: string
  background_image?: string
  theme_color?: string
}

export interface GiftCardCheckResult {
  code_info: {
    code: string
    template: GiftCardTemplateInfo
    status: number
    status_name: string
    expires_at?: number | null
    usage_count?: number
    max_usage?: number
    plan_info?: Record<string, unknown>
  }
  reward_preview: GiftCardRewards
  can_redeem: boolean
  reason?: string | null
}

export interface GiftCardRedeemResult {
  message: string
  rewards: GiftCardRewards
  invite_rewards?: GiftCardRewards
  template_name: string
}

export interface GiftCardHistoryItem {
  id: number
  code: string
  template_name: string
  template_type: number | string
  template_type_name: string
  rewards_given: GiftCardRewards
  invite_rewards?: GiftCardRewards
  multiplier_applied?: number
  created_at?: number
}

export interface GiftCardHistoryResult {
  data: GiftCardHistoryItem[]
  pagination: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface GiftCardDetail {
  id: number
  code: string
  template: GiftCardTemplateInfo
  rewards_given: GiftCardRewards
  invite_rewards?: GiftCardRewards
  invite_user?: { id: number | string; email: string } | null
  user_level_at_use?: number
  plan_id_at_use?: number
  multiplier_applied?: number
  notes?: string
  created_at?: number
}

export async function checkGiftCard(code: string) {
  return request<GiftCardCheckResult>(api.post('/user/gift-card/check', { code }))
}

export async function redeemGiftCard(code: string) {
  return request<GiftCardRedeemResult>(api.post('/user/gift-card/redeem', { code }))
}

export async function fetchGiftCardHistory(params?: { page?: number; per_page?: number }) {
  return request<GiftCardHistoryResult>(api.get('/user/gift-card/history', { params }))
}

export async function fetchGiftCardDetail(id: number) {
  return request<GiftCardDetail>(api.get('/user/gift-card/detail', { params: { id } }))
}

export async function fetchGiftCardTypes() {
  return request<{ types: Record<number, string> }>(api.get('/user/gift-card/types'))
}
