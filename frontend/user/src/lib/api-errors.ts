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
