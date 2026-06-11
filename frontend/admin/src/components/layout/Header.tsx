import { Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clearAuthData } from '@/lib/api'
import { setLocale } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { CommandMenu } from '@/components/shared/CommandMenu'
import { LocaleFlag } from '@/components/shared/LocaleFlag'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LOCALES = [
  { code: 'en-US', label: 'EN' },
  { code: 'zh-CN', label: 'CN' },
  { code: 'ru-RU', label: 'RU' },
]

export function Header() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { theme, toggle } = useTheme()

  function logout() {
    clearAuthData()
    navigate('/sign-in')
  }

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between gap-4 border-b border-border bg-background px-4">
      <CommandMenu key={i18n.language} />
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggle}
          aria-label={theme === 'dark' ? t('common.theme.light') : t('common.theme.dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2">
              <LocaleFlag locale={i18n.language} />
              {LOCALES.find((l) => l.code === i18n.language)?.label ?? 'EN'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LOCALES.map((l) => (
              <DropdownMenuItem key={l.code} onClick={() => setLocale(l.code)}>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="ml-1 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{t('common.user').slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('common.user')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>{t('common.logout')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
