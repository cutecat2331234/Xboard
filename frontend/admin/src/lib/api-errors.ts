type TranslateFn = (key: string, params?: Record<string, string | number>) => string

const MESSAGE_MAP: Record<string, string> = {
  '三级分销比例合计必须等于100%': 'settings.invite.commission_distribution.sum_error',
  'Level 1 + Level 2 + Level 3 ratios must equal 100%': 'settings.invite.commission_distribution.sum_error',
  '邀请佣金比例必须在0-100之间': 'common.error',
  '佣金状态不可手动标记为已结算': 'common.error',
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return ''
}

export function resolveApiError(error: unknown, t: TranslateFn, fallback?: string): string {
  const raw = extractMessage(error).trim()
  if (!raw) return fallback ?? t('common.error')
  const key = MESSAGE_MAP[raw]
  if (key) return t(key)
  return raw
}
