import { api, request, saveAuthData } from '@/api'
import type { AuthPayload } from '@/types/settings'
import type { CaptchaPayload } from '@/api/comm'

export interface LoginForm {
  email: string
  password: string
  email_code?: string
}

export interface RegisterForm extends LoginForm {
  invite_code?: string
  email_code?: string
}

export interface ForgetForm {
  email: string
  password: string
  email_code: string
}

export type AuthFormPayload = CaptchaPayload & Record<string, unknown>

export async function login(form: LoginForm & AuthFormPayload) {
  const data = await request<AuthPayload>(api.post('/passport/auth/login', form))
  saveAuthData(data.auth_data)
  return data
}

export async function register(form: RegisterForm & AuthFormPayload) {
  const data = await request<AuthPayload>(api.post('/passport/auth/register', form))
  saveAuthData(data.auth_data)
  return data
}

export async function forgetPassword(form: ForgetForm & AuthFormPayload) {
  return request<boolean>(api.post('/passport/auth/forget', form))
}

export async function loginWithMailLink(email: string, captcha?: CaptchaPayload) {
  return request<boolean>(api.post('/passport/auth/loginWithMailLink', { email, ...captcha }))
}

/** token2Login returns bare `{ data: AuthPayload }` without status wrapper */
export async function token2Login(verify: string) {
  const { data } = await api.get<{ data?: AuthPayload; message?: string }>('/passport/auth/token2Login', {
    params: { verify },
  })
  if (data.data?.auth_data) {
    saveAuthData(data.data.auth_data)
    return data.data
  }
  throw new Error(data.message || 'Token login failed')
}

export async function telegramLogin(payload: Record<string, unknown>) {
  const data = await request<AuthPayload>(api.post('/passport/auth/telegramLogin', payload))
  saveAuthData(data.auth_data)
  return data
}

export async function logout() {
  try {
    await request<boolean>(api.post('/user/logout'))
  } catch {
    // ignore network errors; always clear local session
  }
  localStorage.removeItem('xboard_auth_data')
}