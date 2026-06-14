import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation, useNavigation } from 'react-router-dom'

type NavHighlightContextValue = {
  activePath: string
  setActivePath: (path: string) => void
}

const NavHighlightContext = createContext<NavHighlightContextValue | null>(null)

export function NavHighlightProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigation = useNavigation()
  const [override, setOverride] = useState<string | null>(null)

  useEffect(() => {
    setOverride(null)
  }, [location.pathname])

  const activePath = useMemo(() => {
    if (navigation.state !== 'idle' && navigation.location) {
      return navigation.location.pathname
    }
    if (override !== null) return override
    return location.pathname
  }, [navigation.state, navigation.location, override, location.pathname])

  const value = useMemo(
    () => ({
      activePath,
      setActivePath: setOverride,
    }),
    [activePath],
  )

  return (
    <NavHighlightContext.Provider value={value}>{children}</NavHighlightContext.Provider>
  )
}

export function useNavHighlight() {
  const ctx = useContext(NavHighlightContext)
  if (!ctx) {
    throw new Error('useNavHighlight must be used within NavHighlightProvider')
  }
  return ctx
}
