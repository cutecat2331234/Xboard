import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clearAuthData, getAuthData, login } from '@/lib/api'
import { getSettings } from '@/lib/settings'
import { ADMIN_LOCALES, localeLabel, setLocale } from '@/lib/i18n'
import { LocaleFlag } from '@/components/shared/LocaleFlag'
import { PasswordInput } from '@/components/shared/PasswordInput'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const emailInputCls =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export default function LoginPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const settings = getSettings()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)

  const resetCommand = t('auth.signIn.resetPassword.command')

  useEffect(() => {
    if (getAuthData()) navigate('/', { replace: true })
  }, [navigate])

  async function copyResetCommand() {
    try {
      await navigator.clipboard.writeText(resetCommand)
      toast.success(t('common.copy.success'))
    } catch {
      toast.error(t('common.copy.failed'))
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const auth = await login({ email, password })
      if (!auth.is_admin) {
        clearAuthData()
        setError(t('login.notAdmin'))
        return
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="xb-auth-bg container relative flex min-h-svh flex-col items-center justify-center px-4 py-8 lg:max-w-none lg:px-0">
      <div className="absolute right-4 top-4 md:right-8 md:top-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs">
              <LocaleFlag locale={i18n.language} />
              <span className="text-sm font-medium">{localeLabel(i18n.language)}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[120px]">
            {ADMIN_LOCALES.map((l) => (
              <DropdownMenuItem
                key={l.code}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-2 py-1.5',
                  i18n.language === l.code && 'bg-accent',
                )}
                onClick={() => setLocale(l.code)}
              >
                <LocaleFlag locale={l.code} />
                <span className={cn('text-sm', i18n.language === l.code && 'font-medium')}>
                  {l.label}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mx-auto flex w-full flex-col justify-center space-y-4 sm:w-[350px] md:w-[420px] lg:p-8">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">{settings.title || 'XBoard'}</h1>
          {settings.description ? (
            <p className="text-sm text-muted-foreground">{settings.description}</p>
          ) : null}
        </div>

        <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-6">
          <div className="flex flex-col space-y-2 text-left">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t('auth.signIn.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('auth.signIn.description')}</p>
          </div>
          <div className="grid gap-6">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-4">
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium leading-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('auth.signIn.email')}
                </Label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="email"
                  placeholder={t('auth.signIn.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={emailInputCls}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium leading-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('auth.signIn.password')}
                </Label>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder={t('auth.signIn.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex h-9 items-center justify-between">
                <button
                  type="button"
                  className="inline-flex items-center justify-center px-0 text-sm font-normal text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => setForgotOpen(true)}
                >
                  {t('auth.signIn.forgotPassword')}
                </button>
              </div>
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                disabled={loading}
              >
                {loading ? t('common.saving') : t('auth.signIn.submit')}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('auth.signIn.resetPassword.title')}</DialogTitle>
            <DialogDescription>{t('auth.signIn.resetPassword.description')}</DialogDescription>
          </DialogHeader>
          <div className="relative mt-4">
            <pre className="max-w-full overflow-x-auto rounded-md bg-secondary p-4 pr-12 text-sm">
              {resetCommand}
            </pre>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 hover:bg-secondary-foreground/10"
              onClick={copyResetCommand}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
