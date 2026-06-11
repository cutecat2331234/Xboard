import { computed, ref } from 'vue'
import type { ThemeColor } from '@/types/settings'

export type ColorScheme = 'light' | 'dark' | 'auto'

const scheme = ref<ColorScheme>('auto')

export const THEME_PALETTES: Record<
  ThemeColor,
  { primary: string; hover: string; pressed: string }
> = {
  default: { primary: '#316C72FF', hover: '#316C72E3', pressed: '#2B4C59FF' },
  blue: { primary: '#2080f0', hover: '#4098fc', pressed: '#1060c9' },
  black: { primary: '#18a058', hover: '#36ad6a', pressed: '#0c7a43' },
  darkblue: { primary: '#004175', hover: '#002c4c', pressed: '#001f35' },
}

export function normalizeThemeColor(color?: string): ThemeColor {
  if (color === 'blue' || color === 'black' || color === 'darkblue') return color
  return 'default'
}

export function getThemePalette(color?: string) {
  return THEME_PALETTES[normalizeThemeColor(color)]
}

export function isThemeDark(color?: string): boolean {
  const normalized = normalizeThemeColor(color)
  return normalized === 'black' || normalized === 'darkblue'
}

function readSettingsThemeColor(): string | undefined {
  return (window as unknown as { settings?: { theme?: { color?: string } } }).settings?.theme
    ?.color
}

function readScheme(): ColorScheme {
  const saved = localStorage.getItem('vueuse-color-scheme')
  if (saved === 'dark' || saved === 'light' || saved === 'auto') return saved
  return 'auto'
}

function applyScheme(value: ColorScheme) {
  scheme.value = value
  localStorage.setItem('vueuse-color-scheme', value)
  const dark =
    value === 'dark' ||
    (value === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function initColorScheme() {
  const settingsColor = readSettingsThemeColor()
  if (isThemeDark(settingsColor)) {
    applyScheme('dark')
  } else {
    applyScheme(readScheme())
  }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (scheme.value === 'auto' && !isThemeDark(readSettingsThemeColor())) applyScheme('auto')
  })
}

export function toggleColorScheme() {
  if (isThemeDark(readSettingsThemeColor())) return
  const dark = document.documentElement.classList.contains('dark')
  applyScheme(dark ? 'light' : 'dark')
}

export function useColorScheme() {
  const isDark = computed(() => document.documentElement.classList.contains('dark'))
  return { scheme, isDark, toggleColorScheme, applyScheme }
}
