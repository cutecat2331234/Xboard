import { shouldForceAdminLogoutOn403 } from '@/lib/auth-forbidden'
import { invalidateAdminSessionCache } from '@/lib/session-cache'
import { getAdminApiPrefix, getPassportApiPrefix, getSettings } from '@/lib/settings'

const AUTH_STORAGE_KEY = 'xboard_admin_auth_data'

export interface ApiResponse<T = unknown> {
  status?: string
  data?: T
  message?: string
  total?: number
  current_page?: number
  code?: number
}

export function getAuthData(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEY)
}

export function setAuthData(authData: string): void {
  localStorage.setItem(AUTH_STORAGE_KEY, authData)
}

export function clearAuthData(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export async function logoutAdmin(): Promise<void> {
  const auth = getAuthData()
  try {
    await fetch('/api/v1/user/logout', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
    })
  } catch {
    // always clear local session
  }
  clearAuthData()
}

function parseApiError(result: ApiResponse<unknown>): void {
  if (result.status === 'fail') {
    throw new Error(result.message || 'Request failed')
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (!headers.has('Content-Type') && options.body && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Accept', 'application/json')

  const auth = getAuthData()
  if (auth) headers.set('Authorization', auth)

  const response = await fetch(url, { ...options, headers })
  if (response.status === 403) {
    let message: string | undefined
    try {
      const payload = (await response.clone().json()) as ApiResponse
      message = payload.message
    } catch {
      // ignore
    }
    if (shouldForceAdminLogoutOn403(message)) {
      clearAuthData()
      invalidateAdminSessionCache()
      window.location.hash = '#/sign-in'
    }
  }
  if (!response.ok) {
    let message = response.statusText
    try {
      const payload = (await response.json()) as ApiResponse
      message = payload.message ?? message
    } catch {
      // ignore
    }
    throw new Error(message || 'Request failed')
  }
  return response.json() as Promise<T>
}

export function adminApi<T>(path: string, options?: RequestInit): Promise<T> {
  const prefix = getAdminApiPrefix()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return request<T>(`${prefix}${normalized}`, options)
}

export function passportApi<T>(path: string, options?: RequestInit): Promise<T> {
  const prefix = getPassportApiPrefix()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return request<T>(`${prefix}${normalized}`, options)
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthPayload {
  token: string
  is_admin?: boolean
  auth_data: string
}

export async function login(payload: LoginPayload): Promise<AuthPayload> {
  const result = await passportApi<ApiResponse<AuthPayload>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  parseApiError(result)
  if (!result.data?.auth_data) throw new Error(result.message ?? 'Login failed')
  setAuthData(result.data.auth_data)
  return result.data
}

export interface PaginatedResult<T = unknown> {
  data: T[]
  total: number
  current_page?: number
  per_page?: number
  last_page?: number
}

export function buildQuery(
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value))
    }
  }
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

function parseListPayload(result: unknown): unknown[] {
  if (Array.isArray(result)) return result
  if (!result || typeof result !== 'object') return []

  const payload = result as ApiResponse<unknown> & PaginatedResult<unknown>
  if (payload.status === 'fail') {
    parseApiError(payload)
  }

  if (Array.isArray(payload.data)) {
    return payload.data
  }

  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    const nested = payload.data as Record<string, unknown>
    if (Array.isArray(nested.themes)) return nested.themes
    if (Array.isArray(nested.list)) return nested.list
  }

  return []
}

export async function fetchPaginatedList<T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  options?: RequestInit,
): Promise<PaginatedResult<T>> {
  const result = await adminApi<PaginatedResult<T> & ApiResponse<T[]> | T[]>(
    `${path}${buildQuery(params)}`,
    options,
  )

  if (Array.isArray(result)) {
    return { data: result as T[], total: result.length }
  }

  if (result && typeof result === 'object' && Array.isArray(result.data)) {
    if ('total' in result && typeof result.total === 'number') {
      return {
        data: result.data as T[],
        total: result.total,
        current_page: result.current_page,
        per_page: result.per_page,
        last_page: result.last_page,
      }
    }
    const nested =
      'pagination' in result &&
      result.pagination &&
      typeof result.pagination === 'object' &&
      !Array.isArray(result.pagination)
        ? (result.pagination as PaginatedResult<T>)
        : null
    if (nested && typeof nested.total === 'number') {
      return {
        data: result.data as T[],
        total: nested.total,
        current_page: nested.current_page,
        per_page: nested.per_page,
        last_page: nested.last_page,
      }
    }
    if (result.status !== 'fail') {
      return { data: result.data as T[], total: result.data.length }
    }
  }

  parseApiError(result as ApiResponse)
  return { data: [], total: 0 }
}

export async function fetchAllPaginatedList<T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  pageSize = 500,
): Promise<T[]> {
  let current = 1
  const all: T[] = []
  let total = 0
  do {
    const page = await fetchPaginatedList<T>(path, { ...params, current, pageSize })
    all.push(...page.data)
    total = page.total
    current += 1
  } while (all.length < total && pageSize > 0)
  return all
}

export async function fetchJsonList(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  options?: RequestInit,
): Promise<unknown[]> {
  const page = await fetchPaginatedList(path, params, options)
  return page.data
}

export async function fetchJsonObject<T>(path: string, options?: RequestInit): Promise<T> {
  const result = await adminApi<ApiResponse<T>>(path, options)
  parseApiError(result)
  if (result.data !== undefined) return result.data
  return {} as T
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const result = await adminApi<ApiResponse<T>>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  parseApiError(result)
  return (result.data ?? result) as T
}

function parseContentDispositionFilename(header: string | null): string | undefined {
  if (!header) return undefined
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8?.[1]) return decodeURIComponent(utf8[1])
  const plain = header.match(/filename="?([^";]+)"?/i)
  return plain?.[1]
}

/** Download a file from admin API (e.g. CSV export). */
export async function downloadAdminFile(
  path: string,
  options?: RequestInit & { jsonBody?: unknown },
  fallbackFilename = 'download.csv',
): Promise<void> {
  const prefix = getAdminApiPrefix()
  const normalized = path.startsWith('/') ? path : `/${path}`
  const headers = new Headers(options?.headers)
  headers.set('Accept', 'text/csv,application/octet-stream,application/json')

  const auth = getAuthData()
  if (auth) headers.set('Authorization', auth)

  const body =
    options?.jsonBody !== undefined
      ? JSON.stringify(options.jsonBody)
      : options?.body

  if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${prefix}${normalized}`, {
    ...options,
    headers,
    body,
  })

  if (response.status === 403) {
    let message: string | undefined
    try {
      const payload = (await response.clone().json()) as ApiResponse
      message = payload.message
    } catch {
      // ignore
    }
    if (shouldForceAdminLogoutOn403(message)) {
      clearAuthData()
      invalidateAdminSessionCache()
      window.location.hash = '#/sign-in'
    }
  }

  if (!response.ok) {
    let message = response.statusText
    try {
      const payload = (await response.json()) as ApiResponse
      message = payload.message ?? message
    } catch {
      // ignore
    }
    throw new Error(message || 'Download failed')
  }

  const blob = await response.blob()
  const filename =
    parseContentDispositionFilename(response.headers.get('Content-Disposition')) ??
    fallbackFilename
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export interface DashboardStats {
  todayIncome?: number
  dayIncomeGrowth?: number
  currentMonthIncome?: number
  lastMonthIncome?: number
  monthIncomeGrowth?: number
  lastMonthIncomeGrowth?: number
  currentMonthCommissionPayout?: number
  lastMonthCommissionPayout?: number
  commissionGrowth?: number
  ticketPendingTotal?: number
  commissionPendingTotal?: number
  currentMonthNewUsers?: number
  totalUsers?: number
  activeUsers?: number
  userGrowth?: number
  onlineUsers?: number
  onlineDevices?: number
  onlineNodes?: number
  todayTraffic?: { upload?: number; download?: number; total?: number }
  monthTraffic?: { upload?: number; download?: number; total?: number }
  totalTraffic?: { upload?: number; download?: number; total?: number }
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const result = await adminApi<ApiResponse<DashboardStats>>('/stat/getStats')
  parseApiError(result)
  return result.data ?? {}
}

export interface OrderChartData {
  list: Array<Record<string, unknown>>
  summary: Record<string, unknown>
}

export async function fetchOrderChart(params?: Record<string, string>): Promise<OrderChartData> {
  const qs = params ? `?${new URLSearchParams(params)}` : ''
  const result = await adminApi<ApiResponse<OrderChartData>>(`/stat/getOrder${qs}`)
  parseApiError(result)
  return result.data ?? { list: [], summary: {} }
}

export async function fetchTrafficRank(type: 'node' | 'user', start?: number, end?: number) {
  const params = new URLSearchParams({ type })
  if (start) params.set('start_time', String(start))
  if (end) params.set('end_time', String(end))
  const result = await adminApi<ApiResponse<unknown[]>>(`/stat/getTrafficRank?${params}`)
  parseApiError(result)
  return result.data ?? []
}

export interface QueueStats {
  failedJobs?: number
  jobsPerMinute?: number
  processes?: number
  recentJobs?: number
  status?: boolean
  queueWithMaxRuntime?: string
  wait?: Record<string, number>
}

export async function fetchQueueStats(): Promise<QueueStats> {
  const result = await adminApi<ApiResponse<QueueStats>>('/system/getQueueStats')
  parseApiError(result)
  return result.data ?? {}
}

export interface HorizonFailedJob {
  id?: string
  uuid?: string
  connection?: string
  queue?: string
  name?: string
  failed_at?: string | number
  exception?: string
  payload?: string
}

export async function fetchHorizonFailedJobs(
  current = 1,
  pageSize = 20,
): Promise<PaginatedResult<HorizonFailedJob>> {
  return fetchPaginatedList<HorizonFailedJob>('/system/getHorizonFailedJobs', {
    current,
    page_size: pageSize,
  })
}

export interface SystemStatus {
  schedule?: boolean
  horizon?: boolean
  schedule_last_runtime?: number | null
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  return fetchJsonObject<SystemStatus>('/system/getSystemStatus')
}

export interface QueueWorkloadItem {
  name?: string
  length?: number
  wait?: number
  processes?: number
  split_failed?: boolean
}

export async function fetchQueueWorkload(): Promise<QueueWorkloadItem[]> {
  const data = await fetchJsonObject<QueueWorkloadItem[]>('/system/getQueueWorkload')
  return Array.isArray(data) ? data : []
}

export interface AuditLogRow {
  id?: number
  admin_id?: number
  action?: string
  method?: string
  uri?: string
  request_data?: string
  ip?: string
  created_at?: number
  admin?: { id?: number; email?: string }
}

export async function fetchAuditLog(
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<PaginatedResult<AuditLogRow>> {
  return fetchPaginatedList<AuditLogRow>('/system/getAuditLog', params)
}

export interface TelegramWebhookResult {
  success?: boolean
  webhook_url?: string
  webhook_base_url?: string
}

export async function setTelegramWebhook(
  telegramBotToken?: string,
  telegramWebhookUrl?: string,
): Promise<TelegramWebhookResult> {
  return postJson<TelegramWebhookResult>('/config/setTelegramWebhook', {
    telegram_bot_token: telegramBotToken,
    telegram_webhook_url: telegramWebhookUrl,
  })
}

export interface EchKeyPair {
  key?: string
  config?: string
}

export async function generateEchKey(publicName?: string): Promise<EchKeyPair> {
  return postJson<EchKeyPair>('/server/manage/generateEchKey', {
    public_name: publicName ?? '',
  })
}

export async function fetchConfig(): Promise<Record<string, unknown>> {
  return fetchJsonObject<Record<string, unknown>>('/config/fetch')
}

export async function saveConfig(data: Record<string, unknown>) {
  return postJson('/config/save', data)
}

export interface ThemeItem {
  name?: string
  theme?: string
  version?: string
  description?: string
  [key: string]: unknown
}

export interface ThemeListData {
  themes: ThemeItem[]
  active: string
}

export async function fetchThemes(): Promise<ThemeListData> {
  const data = await fetchJsonObject<ThemeListData>('/theme/getThemes')
  return {
    themes: Array.isArray(data.themes) ? data.themes : [],
    active: data.active ?? 'Xboard',
  }
}

export type PaymentFormField = {
  type?: string
  label?: string
  placeholder?: string
  description?: string
  value?: unknown
  options?: Array<{ label?: string; value?: string | number }>
  name?: string
  key?: string
}

export interface UpdateCheckInfo {
  has_update?: boolean
  is_local_newer?: boolean
  latest_version?: string
  current_version?: string
  update_logs?: Array<{
    version?: string
    message?: string
    author?: string
    date?: string
    is_local?: boolean
  }>
  download_url?: string
  published_at?: string
  author?: string
}

const GITHUB_COMMITS_API = 'https://api.github.com/repos/cedar2025/xboard/commits?per_page=1'
export const SYSTEM_UPDATE_DOCS_URL = 'https://github.com/cedar2025/Xboard#documentation'

function parseVersionHash(version?: string): string {
  if (!version) return ''
  const parts = version.split('-')
  return (parts[parts.length - 1] ?? '').slice(0, 7).toLowerCase()
}

/** GET /update/check — server-side update check (falls back to GitHub API if unavailable). */
export async function checkSystemUpdate(): Promise<UpdateCheckInfo | null> {
  try {
    return await fetchJsonObject<UpdateCheckInfo>('/update/check')
  } catch {
    return null
  }
}

/** POST /update/execute — run one-click panel update. */
export async function executeSystemUpdate(): Promise<void> {
  await postJson('/update/execute')
}

async function checkSystemUpdateFromConfig(): Promise<UpdateCheckInfo | null> {
  const currentVersion = getSettings().version ?? ''
  const currentHash = parseVersionHash(currentVersion)
  if (!currentHash) return null

  try {
    const response = await fetch(GITHUB_COMMITS_API, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    })
    if (!response.ok) return null

    const commits = (await response.json()) as Array<{ sha?: string; html_url?: string }>
    const latest = commits[0]
    if (!latest?.sha) return null

    const latestHash = latest.sha.slice(0, 7).toLowerCase()
    return {
      has_update: latestHash !== currentHash,
      current_version: currentVersion || currentHash,
      latest_version: latestHash,
      download_url: latest.html_url ?? SYSTEM_UPDATE_DOCS_URL,
    }
  } catch {
    return null
  }
}

export async function fetchSystemUpdateStatus(): Promise<UpdateCheckInfo | null> {
  const fromApi = await checkSystemUpdate()
  if (fromApi) return fromApi
  return checkSystemUpdateFromConfig()
}
