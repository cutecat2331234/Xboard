import { api, getAuthData, request } from '@/api'

export interface GuestConfig {
  tos_url?: string
  is_email_verify?: number
  is_invite_force?: number
  email_whitelist_suffix?: string[] | 0
  is_captcha?: number
  captcha_type?: string
  recaptcha_site_key?: string
  recaptcha_v3_site_key?: string
  recaptcha_v3_score_threshold?: number
  turnstile_site_key?: string
  app_description?: string
  app_name?: string
  stop_register?: number
  app_url?: string
  logo?: string
  telegram_login_enable?: number
  telegram_bot_username?: string
  telegram_login_domain?: string
  try_out_plan_id?: number
  try_out_enable?: number
  traffic_warn_rate?: number
  login_with_mail_link_enable?: number
  invite_enable?: number
  gift_card_enable?: number
  coupon_enable?: number
  register_enable?: number
}

export interface UserCommConfig {
  is_telegram?: number
  telegram_discuss_link?: string
  stripe_pk?: string
  withdraw_methods?: string[]
  withdraw_close?: number
  currency?: string
  currency_symbol?: string
  commission_distribution_enable?: number
  commission_distribution_l1?: number | string
  commission_distribution_l2?: number | string
  commission_distribution_l3?: number | string
  try_out_plan_id?: number
  traffic_warn_rate?: number
  ticket_must_wait_reply?: number
  plan_change_enable?: number
  withdraw_fee_rate?: number
  commission_withdraw_limit?: number | string
  invite_enable?: number
  gift_card_enable?: number
}

const DEFAULT_TRAFFIC_WARN_RATE = 70

export function resolveTrafficWarnRate(config?: { traffic_warn_rate?: number } | null): number {
  const rate = config?.traffic_warn_rate
  if (rate == null) return DEFAULT_TRAFFIC_WARN_RATE
  const n = Number(rate)
  return Number.isFinite(n) ? n : DEFAULT_TRAFFIC_WARN_RATE
}

let cachedTryOutPlanId: number | null = null

export function cacheTryOutPlanId(id: number) {
  cachedTryOutPlanId = id
}

export async function resolveTryOutPlanId(): Promise<number> {
  if (cachedTryOutPlanId !== null) return cachedTryOutPlanId
  try {
    const config = getAuthData() ? await fetchUserCommConfig() : await fetchGuestConfig()
    const enabled = (config as GuestConfig).try_out_enable
    if (enabled !== undefined && Number(enabled) === 0) {
      cacheTryOutPlanId(0)
      return 0
    }
    if (config.try_out_plan_id != null && config.try_out_plan_id > 0) {
      cacheTryOutPlanId(config.try_out_plan_id)
      return config.try_out_plan_id
    }
  } catch {
    /* ignore */
  }
  return 0
}

export type CaptchaPayload = {
  recaptcha_data?: string
  recaptcha_v3_token?: string
  turnstile_token?: string
  skip_recaptcha_v3?: boolean
  skip_recaptcha_v3_error?: boolean
}

function formatEmailVerifyCaptcha(captcha?: CaptchaPayload): Record<string, string | number> {
  if (!captcha) return {}
  if (captcha.skip_recaptcha_v3 || captcha.skip_recaptcha_v3_error) {
    return { skip_recaptcha_v3: 1 }
  }
  const { skip_recaptcha_v3: _skip, skip_recaptcha_v3_error: _skipError, ...fields } = captcha
  return fields
}

export async function fetchGuestConfig() {
  return request<GuestConfig>(api.get('/guest/comm/config'))
}

export async function fetchUserCommConfig() {
  return request<UserCommConfig>(api.get('/user/comm/config'))
}

export async function sendEmailVerify(email: string, captcha?: CaptchaPayload) {
  return request<null>(api.post('/passport/comm/sendEmailVerify', { email, ...formatEmailVerifyCaptcha(captcha) }))
}

export async function fetchStripePublicKey(paymentId: number) {
  return request<string>(api.post('/user/comm/getStripePublicKey', { id: paymentId }))
}