type TranslateFn = (key: string, params?: Record<string, string | number>) => string

const MESSAGE_MAP: Record<string, string> = {
  '三级分销比例合计必须等于100%': 'settings.invite.commission_distribution.sum_error',
  'Level 1 + Level 2 + Level 3 ratios must equal 100%': 'settings.invite.commission_distribution.sum_error',
  '邮箱或密码错误': 'auth.signIn.invalidCredentials',
  'Incorrect email or password': 'auth.signIn.invalidCredentials',
  '该账户已被停止使用': 'auth.signIn.accountSuspended',
  'Your account has been suspended': 'auth.signIn.accountSuspended',
  '邀请佣金比例必须在0-100之间': 'common.error',
  '佣金状态不可手动标记为已结算': 'common.error',
  '已结算的佣金不可回退': 'common.error',
  '订单不存在': 'common.error',
  'Order does not exist': 'common.error',
  'Order does not exist or has been paid': 'common.error',
  '只能对待支付的订单进行操作': 'common.error',
  '只能对待支付或处理中的订单进行操作': 'common.error',
  '已支付订单不可取消，请先处理退款': 'common.error',
  'You can only cancel pending orders': 'common.error',
  'Payment is in progress for this order, cannot cancel': 'common.error',
  'Cancel failed': 'common.error',
  'Payment gateway request failed': 'common.error',
  'Telegram Webhook地址未配置': 'settings.telegram.webhookMissing',
  'Telegram Bot Token 未配置': 'settings.telegram.tokenMissing',
  '邀请人已被封禁，无法设置': 'user.invite.inviterBanned',
  '余额不能为负数': 'user.edit.negativeBalance',
  '佣金余额不能为负数': 'user.edit.negativeCommission',
  '不能将自己设为邀请人': 'user.invite.selfInviter',
  '邀请链存在循环，无法设置': 'user.invite.cycleDetected',
  '订单开通失败': 'order.assign.createFailed',
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
  '用户存在待处理的提现工单，请先处理后再删除': 'user.delete.pendingWithdraw',
  '用户存在支付处理中的订单，请等待开通完成或退款后再删除': 'user.delete.pendingOrder',
  '用户仍有站内余额或佣金余额，请先清零后再删除': 'user.delete.nonZeroBalance',
  '无法取消用户未完成订单，请先处理订单后再删除': 'user.delete.openOrders',
  '删除失败': 'user.delete.failed',
  '请提供 email_prefix 或 generate_count': 'user.generate.missingParams',
  '支付金额不能超过订阅标价': 'order.assign.amountExceedsPrice',
  '该订单已有佣金记录，不可重新标记为待确认': 'order.commission.alreadyPaid',
  '该用户已被封禁，无法分配订阅': 'order.assign.userBanned',
  '订单创建失败': 'order.assign.createFailed',
  'Cannot set yourself as inviter': 'user.invite.selfInviter',
  'Invite chain cycle detected': 'user.invite.cycleDetected',
  '优惠券不存在': 'coupon.notFound',
  '不能将自己设为邀请人': 'user.invite.selfInviter',
  '邀请链存在循环，无法设置': 'user.invite.cycleDetected',
  '创建失败': 'giftCard.messages.createFailed',
  '模板不存在': 'giftCard.messages.templateNotFound',
  '兑换码已过期，无法启用': 'giftCard.messages.codeExpiredEnable',
  '兑换码不存在': 'giftCard.messages.codeNotFound',
  '该礼品卡类型已停用': 'giftCard.messages.templateDisabled',
  '删除失败': 'giftCard.messages.deleteFailed',
  '更新失败': 'giftCard.messages.updateFailed',
  '该模板下存在兑换码，无法删除': 'giftCard.messages.templateHasCodes',
  'Already closed': 'ticket.alreadyClosed',
  'Withdraw ticket requires withdraw_paid or withdraw_rejected': 'ticket.withdrawCloseRequired',
  '该支付方式仍有待支付或处理中的订单，无法删除': 'payment.delete.pendingOrders',
  'Template has existing codes and cannot be deleted': 'giftCard.messages.templateHasCodes',
  'Redemption code used cannot be enabled': 'giftCard.messages.codeUsedEnable',
  'Redemption code expired cannot be enabled': 'giftCard.messages.codeExpiredEnable',
  'Operation failed': 'common.error',
  'Redemption code cannot be reset to unused': 'giftCard.messages.codeResetUnused',
  'Max usage cannot be less than usage count': 'giftCard.messages.maxUsageBelowCount',
  'Used gift card cannot be deleted': 'giftCard.messages.usedCodeDelete',
  'Gift card has usage records and cannot be deleted': 'giftCard.messages.codeHasUsage',
  'Gift card template does not exist': 'giftCard.messages.templateNotFound',
  'Redemption code does not exist': 'giftCard.messages.codeNotFound',
  'This gift card type is disabled': 'giftCard.messages.templateDisabled',
  'Create failed': 'giftCard.messages.createFailed',
  'Update failed': 'giftCard.messages.updateFailed',
  'Delete failed': 'giftCard.messages.deleteFailed',
  'Coupon does not exist': 'coupon.notFound',
  'Coupon ID cannot be empty': 'coupon.idRequired',
  'Coupon ID must be numeric': 'coupon.idNumeric',
  'Inviter does not exist': 'user.invite.inviterNotFound',
  'User ID cannot be empty': 'common.error',
  'Inviter is banned and cannot be assigned': 'user.invite.inviterBanned',
  'Save failed': 'common.error',
  'Generation failed': 'user.generate.failed',
  'Processing failed': 'common.error',
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
