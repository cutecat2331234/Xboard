/** Backend comm flags are 0/1 integers; treat unset as off until config loads. */
export function featureEnabled(flag: number | undefined | null, configLoaded = true): boolean {
  if (!configLoaded) return false
  return Number(flag) === 1
}
