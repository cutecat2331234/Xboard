import { Package } from 'lucide-react'
import { IconMoon, IconSun } from '@tabler/icons-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clearAuthData } from '@/lib/api'
import { ADMIN_LOCALES, localeLabel, setLocale } from '@/lib/i18n'
import { titleForPath, titleKeyForPath } from '@/lib/page-title'
import { pluginTitleForPath } from '@/lib/plugin-menus'
import { usePluginList } from '@/lib/use-plugin-list'
import { toolbarModeForPath } from '@/lib/toolbar-mode'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { CommandMenu } from '@/components/shared/CommandMenu'
import { LocaleFlag } from '@/components/shared/LocaleFlag'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ADMIN_AVATAR =
  'https://cdn.v2ex.com/gravatar/1fbc608854d0b079585d221dbfc5d6f3?s=64&d=identicon'

export function PageToolbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { theme, toggle } = useTheme()
  const { plugins } = usePluginList()
  const mode = toolbarModeForPath(pathname)
  const titleKey = titleKeyForPath(pathname)
  const pluginTitle = titleForPath(pathname) ? pluginTitleForPath(pathname, plugins) : null

  function logout() {
    clearAuthData()
    navigate('/sign-in')
  }

  return (
    <div
      className={cn(
        'flex h-[var(--header-height)] flex-none items-center bg-background p-4 md:px-8',
        mode === 'icon-title' ? 'justify-between' : 'gap-4',
      )}
    >
      {mode === 'dashboard' ? (
        <div className="flex items-center">
          <h1 className="m-0 text-2xl font-bold tracking-tight md:text-3xl">{t(titleKey)}</h1>
        </div>
      ) : null}

      {mode === 'icon-title' ? (
        <div className="flex items-center space-x-4">
          <Package className="h-6 w-6" strokeWidth={2} />
          <h1 className="text-2xl font-bold tracking-tight">
            {pluginTitle ?? t(titleKey)}
          </h1>
        </div>
      ) : null}

      {mode === 'search-only' ? <CommandMenu /> : null}

      <div className={cn('flex items-center space-x-4', mode !== 'icon-title' && 'ml-auto')}>
        {mode === 'dashboard' ? <CommandMenu /> : null}
        <button
          type="button"
          onClick={toggle}
          className="inline-flex h-9 w-9 items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          aria-label={theme === 'dark' ? t('common.theme.light') : t('common.theme.dark')}
        >
          {theme === 'dark' ? <IconSun size={20} stroke={2} /> : <IconMoon size={20} stroke={2} />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
            >
              <LocaleFlag locale={i18n.language} />
              <span className="text-sm font-medium">
                {localeLabel(i18n.language)}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ADMIN_LOCALES.map((l) => (
              <DropdownMenuItem key={l.code} onClick={() => setLocale(l.code)}>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative inline-flex h-8 w-8 items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={ADMIN_AVATAR} alt="admin" />
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
    </div>
  )
}
