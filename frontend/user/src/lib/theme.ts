import { computed, ref } from 'vue'

export type ColorScheme = 'light' | 'dark' | 'auto'

const scheme = ref<ColorScheme>('auto')

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
  applyScheme(readScheme())
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (scheme.value === 'auto') applyScheme('auto')
  })
}

export function toggleColorScheme() {
  const dark = document.documentElement.classList.contains('dark')
  applyScheme(dark ? 'light' : 'dark')
}

export function useColorScheme() {
  const isDark = computed(() => document.documentElement.classList.contains('dark'))
  return { scheme, isDark, toggleColorScheme, applyScheme }
}
