type TranslateFn = (key: string, params?: Record<string, string | number>) => string

/** Backend message (en key or zh-CN value) → frontend i18n key */
const MESSAGE_MAP: Record<string, string> = {
  // Auth — login / register / mail link
  'Incorrect email or password': 'errors.incorrectCredentials',
  '邮箱或密码错误': 'errors.incorrectCredentials',
  'Your account has been suspended': 'errors.accountSuspended',
  '该账户已被停止使用': 'errors.accountSuspended',
  'Token error': 'errors.tokenError',
  '令牌有误': 'errors.tokenError',
  'User not found': 'errors.userNotFound',
  'Invalid request': 'errors.invalidRequest',
  'Sending frequently, please try again later': 'errors.sendingTooFrequent',
  '发送频繁，请稍后再试': 'errors.sendingTooFrequent',
  'Email suffix is not in the Whitelist': 'errors.emailSuffixNotAllowed',
  'Email suffix is not in whitelist': 'errors.emailSuffixNotAllowed',
  '邮箱后缀不处于白名单中': 'errors.emailSuffixNotAllowed',
  '邮箱后缀不在白名单中': 'errors.emailSuffixNotAllowed',
  'Gmail alias is not supported': 'errors.gmailAliasNotSupported',
  '不支持 Gmail 别名邮箱': 'errors.gmailAliasNotSupported',
  'Registration has closed': 'errors.registrationClosed',
  '本站已关闭注册': 'errors.registrationClosed',
  'You must use the invitation code to register': 'errors.inviteCodeRequired',
  '必须使用邀请码才可以注册': 'errors.inviteCodeRequired',
  'Email verification code cannot be empty': 'errors.emailCodeRequired',
  '邮箱验证码不能为空': 'errors.emailCodeRequired',
  'Incorrect email verification code': 'errors.incorrectEmailCode',
  '邮箱验证码有误': 'errors.incorrectEmailCode',
  'Email already exists': 'errors.emailExists',
  '邮箱已在系统中存在': 'errors.emailExists',
  '账号已注册': 'errors.emailExists',
  'Invalid invitation code': 'errors.invalidInviteCode',
  '邀请码无效': 'errors.invalidInviteCode',
  'Register failed': 'errors.registerFailed',
  '注册失败': 'errors.registerFailed',
  'Invalid code is incorrect': 'errors.invalidCaptcha',
  '验证码有误': 'errors.invalidCaptcha',
  'Invalid captcha type': 'errors.invalidCaptchaType',
  'Email verification code has been sent, please request again later': 'errors.emailCodeSentRecently',
  '验证码已发送，请过一会儿再请求': 'errors.emailCodeSentRecently',
  'This email is not registered in the system': 'errors.emailNotRegistered',
  '该邮箱不存在系统中': 'errors.emailNotRegistered',
  'Reset failed': 'errors.resetFailed',
  '重置失败': 'errors.resetFailed',
  'Reset failed, Please try again later': 'errors.resetTooFrequent',
  '重置失败，请稍后再试': 'errors.resetTooFrequent',

  // Auth — ResponseEnum
  '授权失败，请先登录': 'errors.unauthorized',
  '账号信息已过期，请重新登录': 'errors.sessionExpired',
  '账号在其他设备登录，请重新登录': 'errors.sessionKicked',
  '登录失败': 'errors.loginFailed',

  // Order
  'Order does not exist': 'errors.orderNotFound',
  '订单不存在': 'errors.orderNotFound',
  'Order does not exist or has been paid': 'errors.orderNotFoundOrPaid',
  '订单不存在或已支付': 'errors.orderNotFoundOrPaid',
  'Subscription plan does not exist': 'errors.planNotFound',
  '订阅计划不存在': 'errors.planNotFound',
  'Payment method is not available': 'errors.paymentMethodUnavailable',
  '支付方式不可用': 'errors.paymentMethodUnavailable',
  'Request failed, please try again later': 'errors.requestFailed',
  '请求失败，请稍后再试': 'errors.requestFailed',
  '支付失败': 'errors.paymentFailed',
  'Invalid parameter': 'errors.invalidParameter',
  '参数错误': 'errors.invalidParameter',
  'You can only cancel pending orders': 'errors.cancelPendingOnly',
  '只可以取消待支付订单': 'errors.cancelPendingOnly',
  'Cancel failed': 'errors.cancelFailed',
  '取消失败': 'errors.cancelFailed',
  'You have an unpaid or pending order, please try again later or cancel it':
    'errors.unpaidOrderExists',
  '您有未付款或开通中的订单，请稍后再试或将其取消': 'errors.unpaidOrderExists',
  'Insufficient balance': 'errors.insufficientBalance',
  '余额不足': 'errors.insufficientBalance',
  'Payment failed. Please check your credit card information': 'errors.paymentCardFailed',
  '扣款失败，请检查信用卡信息': 'errors.paymentCardFailed',
  'Payment gateway request failed': 'errors.paymentGatewayFailed',
  '支付网关请求失败': 'errors.paymentGatewayFailed',
  'Payment is in progress for this order, cannot cancel': 'errors.paymentInProgress',
  '订单支付进行中，无法取消': 'errors.paymentInProgress',
  'Please wait for the technical enginneer to reply': 'errors.ticketWaitForReply',
  'Please wait for the technical engineer to reply': 'errors.ticketWaitForReply',
  'Unsupported withdraw': 'errors.withdrawUnsupported',
  'Insufficient commission balance': 'errors.insufficientCommission',
  '佣金余额不足': 'errors.insufficientCommission',
  'You already have a pending withdrawal request': 'errors.pendingWithdrawTicket',
  'The current required minimum withdrawal commission is :limit': 'errors.withdrawMinimum',
  'Uh-oh, we\'ve had some problems, we\'re working on it.': 'errors.serverError',
  '遇到了些问题，我们正在进行处理': 'errors.serverError',
  'Request failed': 'errors.requestFailed',
  '目前不允许更改订阅，请联系客服或提交工单操作': 'errors.planChangeDisabled',
  'Unsupported withdrawal method': 'errors.withdrawMethodUnsupported',
  '不支持的提现方式': 'errors.withdrawMethodUnsupported',

  // Coupon
  'Invalid coupon': 'errors.invalidCoupon',
  '优惠券无效': 'errors.invalidCoupon',
  'Coupon cannot be empty': 'errors.couponEmpty',
  '优惠券不能为空': 'errors.couponEmpty',
  'This coupon has expired': 'errors.couponExpired',
  '优惠券已过期': 'errors.couponExpired',
  'The coupon code cannot be used for this period': 'errors.couponPeriodMismatch',
  '优惠券不可用于该订阅周期': 'errors.couponPeriodMismatch',
  'Coupon failed': 'errors.couponFailed',
  '优惠券使用失败': 'errors.couponFailed',
  'This coupon is no longer available': 'errors.couponUsedUp',
  '优惠券不可用': 'errors.couponUsedUp',
  'This coupon has not yet started': 'errors.couponNotStarted',
  '优惠券尚未开始': 'errors.couponNotStarted',
  'The coupon code cannot be used for this subscription': 'errors.couponPlanMismatch',
  '优惠券不可用于该订阅': 'errors.couponPlanMismatch',
  'The coupon can only be used :limit_use_with_user per person': 'errors.couponPerUserLimit',
  '兑换失败，请稍后重试': 'errors.giftCardRedeemFailed',

  // Plan / order
  'Current product is sold out': 'errors.planSoldOut',
  '当前商品已售罄': 'errors.planSoldOut',
  'This payment period cannot be purchased, please choose another period': 'errors.planPeriodUnavailable',
  '该订阅周期不可购买，请选择其他周期': 'errors.planPeriodUnavailable',
  'This subscription cannot be renewed, please change to another subscription': 'errors.planRenewDisabled',
  '该订阅不可续费，请更换其他订阅': 'errors.planRenewDisabled',
  'Subscription has expired or no active subscription, unable to purchase Data Reset Package': 'errors.resetTrafficNoSub',
  '订阅已过期或无有效订阅，无法购买流量重置包': 'errors.resetTrafficNoSub',
  'Failed to create order': 'errors.orderCreateFailed',
  '创建订单失败': 'errors.orderCreateFailed',
  'Checkout failed': 'errors.checkoutFailed',
  '结算失败': 'errors.checkoutFailed',

  // Ticket
  'Ticket does not exist': 'errors.ticketNotFound',
  '工单不存在': 'errors.ticketNotFound',
  'Message cannot be empty': 'errors.ticketMessageEmpty',
  '消息不能为空': 'errors.ticketMessageEmpty',
  'The ticket is closed': 'errors.ticketClosed',
  '工单已关闭': 'errors.ticketClosed',
  'The ticket is closed and cannot be replied': 'errors.ticketClosedReply',
  '工单已关闭，无法回复': 'errors.ticketClosedReply',
  'Ticket reply failed': 'errors.ticketReplyFailed',
  '工单回复失败': 'errors.ticketReplyFailed',
  'Close failed': 'errors.ticketCloseFailed',
  '关闭失败': 'errors.ticketCloseFailed',
  'Ticket subject cannot be empty': 'errors.ticketSubjectEmpty',
  '工单主题不能为空': 'errors.ticketSubjectEmpty',

  // Profile
  'The old password is wrong': 'errors.oldPasswordWrong',
  '旧密码有误': 'errors.oldPasswordWrong',
  'Password must be greater than 8 digits': 'errors.passwordTooShort',
  '密码必须大于8位': 'errors.passwordTooShort',
  'Save failed': 'errors.saveFailed',
  '保存失败': 'errors.saveFailed',
  'Transfer failed': 'errors.transferFailed',
  '划转失败': 'errors.transferFailed',
  'Telegram account is not bound': 'errors.telegramNotBound',
  '未绑定 Telegram 账号': 'errors.telegramNotBound',
  'Failed to unbind Telegram account': 'errors.telegramUnbindFailed',
  '解绑 Telegram 账号失败': 'errors.telegramUnbindFailed',

  // Invite
  'The maximum number of creations has been reached': 'errors.inviteCodeLimit',
  '已达到最大创建数量': 'errors.inviteCodeLimit',

  // Stripe
  'payment is not found': 'errors.paymentNotFound',

  // Gift card
  '兑换码不存在': 'errors.giftCardNotFound',
  '该礼品卡类型已停用': 'errors.giftCardDisabled',
  '您不满足此礼品卡的使用条件': 'errors.giftCardIneligible',
  '您已达到此礼品卡的使用限制': 'errors.giftCardLimitReached',
  '查询失败，请稍后重试': 'errors.giftCardQueryFailed',
}

interface ErrorPattern {
  test: (message: string) => boolean
  key: string
  params?: (message: string) => Record<string, string | number> | undefined
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    test: (m) =>
      /too many password errors/i.test(m) || /密码错误次数过多/.test(m),
    key: 'errors.passwordTooManyAttempts',
    params: (m) => {
      const hit = m.match(/(\d+)/)
      return hit ? { minute: hit[1] } : undefined
    },
  },
  {
    test: (m) => /register frequently/i.test(m) || /注册频繁/.test(m),
    key: 'errors.registerTooFrequent',
    params: (m) => {
      const hit = m.match(/(\d+)/)
      return hit ? { minute: hit[1] } : undefined
    },
  },
  {
    test: (m) =>
      /minimum withdrawal commission/i.test(m) || /最低.*提现/.test(m),
    key: 'errors.withdrawMinimum',
    params: (m) => {
      const hit = m.match(/(\d+(?:\.\d+)?)/)
      return hit ? { limit: hit[1] } : undefined
    },
  },
  {
    test: (m) =>
      /coupon can only be used/i.test(m) || /每人.*使用/.test(m),
    key: 'errors.couponPerUserLimit',
    params: (m) => {
      const hit = m.match(/(\d+)/)
      return hit ? { limit: hit[1] } : undefined
    },
  },
  {
    test: (m) => m.startsWith('兑换码不可用'),
    key: 'errors.giftCardNotFound',
  },
  {
    test: (m) =>
      m === '礼品卡模板不存在' ||
      m === '关联套餐不存在' ||
      m === '未设置使用用户',
    key: 'errors.giftCardNotFound',
  },
  {
    test: (m) => m === '余额发放失败' || m === '用户信息更新失败',
    key: 'errors.requestFailed',
  },
]

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const e = error as {
      message?: string
      response?: { data?: { message?: string | string[] } }
    }
    const dataMsg = e.response?.data?.message
    if (dataMsg) return Array.isArray(dataMsg) ? dataMsg[0] : dataMsg
    if (e.message) return e.message
  }
  return ''
}

/**
 * Map a caught API error to a localized message.
 * Falls back to the raw backend message when no mapping exists.
 */
export function resolveApiError(
  error: unknown,
  t: TranslateFn,
  fallback?: string,
): string {
  const message = extractMessage(error)
  if (!message) return fallback ?? t('common.error')

  const exactKey = MESSAGE_MAP[message]
  if (exactKey) {
    const translated = t(exactKey)
    if (translated !== exactKey) return translated
  }

  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      const params = pattern.params?.(message)
      const translated = t(pattern.key, params)
      if (translated !== pattern.key) return translated
    }
  }

  return message || (fallback ?? t('common.error'))
}
