import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clearAuthData, getAuthData, login } from '@/lib/api'
import { getSettings } from '@/lib/settings'
import { ADMIN_LOCALES, localeLabel, setLocale } from '@/lib/i18n'
import { LocaleFlag } from '@/components/shared/LocaleFlag'
import { PasswordInput } from '@/components/shared/PasswordInput'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const inputCls =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'

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
    <div className="container relative flex min-h-svh flex-col items-center justify-center bg-primary-foreground px-4 py-8 lg:max-w-none lg:px-0">
      <div className="absolute right-4 top-4 md:right-8 md:top-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <LocaleFlag locale={i18n.language} />
              <span className="text-sm font-medium">{localeLabel(i18n.language)}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {ADMIN_LOCALES.map((l) => (
              <DropdownMenuItem key={l.code} onClick={() => setLocale(l.code)}>
                {l.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] md:w-[420px] lg:p-8">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">{settings.title || 'XBoard'}</h1>
          <p className="text-sm text-muted-foreground">{settings.description ?? ''}</p>
        </div>

        <div className="rounded-xl border bg-card p-4 text-card-foreground shadow sm:p-6">
          <div className="flex flex-col space-y-2 text-left">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {t('auth.signIn.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('auth.signIn.description')}</p>
          </div>
          <div className="grid gap-6">
            <form className="space-y-4" onSubmit={onSubmit}>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t('auth.signIn.email')}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="email"
                  placeholder={t('auth.signIn.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
              <div className="flex items-center justify-between">
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
                className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                disabled={loading}
              >
                {loading ? t('common.saving') : t('auth.signIn.submit')}
              </button>
            </form>
          </div>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('auth.signIn.resetPassword.title')}</DialogTitle>
            <DialogDescription>{t('auth.signIn.resetPassword.description')}</DialogDescription>
          </DialogHeader>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{resetCommand}</pre>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={copyResetCommand}
          >
            {t('common.copy')}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
