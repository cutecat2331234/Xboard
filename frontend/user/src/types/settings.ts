export type ThemeColor = 'default' | 'blue' | 'black' | 'darkblue'

export interface AppSettings {
  title: string
  description?: string
  assets_path: string
  theme: {
    color: ThemeColor
  }
  version?: string
  background_url?: string
  i18n?: string[]
  logo?: string
}

export interface AuthPayload {
  token: string
  auth_data: string
  is_admin?: boolean
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'fail'
  message: string
  data: T
  error?: unknown
}
