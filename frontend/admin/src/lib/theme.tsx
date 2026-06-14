import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type Theme = 'light' | 'dark'

const ThemeStateContext = createContext<Theme>('light')
const ThemeToggleContext = createContext<() => void>(() => {})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('xboard_admin_theme')
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('xboard_admin_theme', theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }, [])

  return (
    <ThemeStateContext.Provider value={theme}>
      <ThemeToggleContext.Provider value={toggle}>{children}</ThemeToggleContext.Provider>
    </ThemeStateContext.Provider>
  )
}

export function useTheme() {
  return {
    theme: useContext(ThemeStateContext),
    toggle: useContext(ThemeToggleContext),
  }
}
