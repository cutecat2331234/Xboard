type TranslateFn = (key: string, params?: Record<string, string | number>) => string

const MESSAGE_MAP: Record<string, string> = {
  '三级分销比例合计必须等于100%': 'settings.invite.commission_distribution.sum_error',
  'Level 1 + Level 2 + Level 3 ratios must equal 100%': 'settings.invite.commission_distribution.sum_error',
  '邀请佣金比例必须在0-100之间': 'common.error',
  '佣金状态不可手动标记为已结算': 'common.error',
  '已结算的佣金不可回退': 'common.error',
  '订单不存在': 'common.error',
  '只能对待支付的订单进行操作': 'common.error',
  '只能对待支付或处理中的订单进行操作': 'common.error',
  '已支付订单不可取消，请先处理退款': 'common.error',
  '订单开通失败': 'common.error',
  '该用户不存在': 'common.error',
  '该订阅不存在': 'common.error',
  '该用户还有待支付的订单，无法分配': 'common.error',
  '该订阅周期不可购买': 'common.error',
  '用户不存在': 'common.error',
  '邮箱已被使用': 'common.error',
  '邮箱已存在于系统中': 'common.error',
  '订阅计划不存在': 'common.error',
  '保存失败': 'common.error',
  '更新失败': 'common.error',
  '处理失败': 'common.error',
  '生成失败': 'common.error',
  'user_ids不能为空': 'common.error',
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

type ToastLike = { error: (message: string) => void }

/** Show a translated API error in admin toasts (maps known backend messages to i18n keys). */
export function toastApiError(
  error: unknown,
  toast: ToastLike,
  t: TranslateFn,
  fallback?: string,
): void {
  toast.error(resolveApiError(error, t, fallback))
}
