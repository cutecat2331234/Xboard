export function isEmailWhitelistEnabled(suffix: unknown): suffix is string[] {
  return Array.isArray(suffix) && suffix.length > 0
}

export function defaultEmailSuffix(suffixes: string[]): string {
  return suffixes[0] ? `@${suffixes[0]}` : ''
}

export function composeEmail(local: string, suffix: string, full: string): string {
  if (suffix) return `${local.trim()}${suffix}`
  return full.trim()
}
