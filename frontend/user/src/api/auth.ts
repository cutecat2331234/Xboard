import { api, request, saveAuthData } from '@/api'
import type { AuthPayload } from '@/types/settings'

export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm extends LoginForm {
  invite_code?: string
  email_code?: string
}

export async function login(form: LoginForm) {
  const data = await request<AuthPayload>(api.post('/passport/auth/login', form))
  saveAuthData(data.auth_data)
  return data
}

export async function register(form: RegisterForm) {
  const data = await request<AuthPayload>(api.post('/passport/auth/register', form))
  saveAuthData(data.auth_data)
  return data
}

export function logout() {
  localStorage.removeItem('xboard_auth_data')
}
