import { useNavigate } from 'react-router-dom'
import { clearAuthData } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { getSettings } from '@/lib/settings'

export function Header() {
  const navigate = useNavigate()
  const { title } = getSettings()

  function logout() {
    clearAuthData()
    navigate('/sign-in')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 shadow-sm">
      <span className="text-sm font-medium text-muted-foreground">{title}</span>
      <Button variant="outline" size="sm" onClick={logout}>
        Sign out
      </Button>
    </header>
  )
}
