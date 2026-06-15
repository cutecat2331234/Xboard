/** Backend messages that mean the session is invalid — not generic HTTP 403 business rules. */
const USER_AUTH_FORBIDDEN_403 = [
  '未登录或登陆已过期',
  '账号已被封禁',
  '授权失败，请先登录',
  '账号信息已过期，请重新登录',
  '账号在其他设备登录，请重新登录',
] as const

export function shouldForceLogoutOn403(message: unknown): boolean {
  if (typeof message !== 'string' || !message) return false
  return USER_AUTH_FORBIDDEN_403.some((m) => message.includes(m))
}
