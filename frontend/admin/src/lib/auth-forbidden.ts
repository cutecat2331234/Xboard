/** Admin middleware returns exactly this when auth/session is invalid. */
export function shouldForceAdminLogoutOn403(message: unknown): boolean {
  return message === 'Unauthorized'
}
