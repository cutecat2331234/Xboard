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
  app_url?: string
  logo?: string
  telegram_login_enable?: number
  telegram_bot_username?: string
  telegram_login_domain?: string
  try_out_plan_id?: number
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
}

let cachedTryOutPlanId: number | null = null

export function cacheTryOutPlanId(id: number) {
  cachedTryOutPlanId = id
}

export async function resolveTryOutPlanId(): Promise<number> {
  if (cachedTryOutPlanId !== null) return cachedTryOutPlanId
  try {
    const config = getAuthData() ? await fetchUserCommConfig() : await fetchGuestConfig()
    if (config.try_out_plan_id != null) {
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
}

export async function fetchGuestConfig() {
  return request<GuestConfig>(api.get('/guest/comm/config'))
}

export async function fetchUserCommConfig() {
  return request<UserCommConfig>(api.get('/user/comm/config'))
}

export async function sendEmailVerify(email: string, captcha?: CaptchaPayload) {
  return request<null>(api.post('/passport/comm/sendEmailVerify', { email, ...captcha }))
}

export async function fetchStripePublicKey(paymentId: number) {
  return request<string>(api.post('/user/comm/getStripePublicKey', { id: paymentId }))
}