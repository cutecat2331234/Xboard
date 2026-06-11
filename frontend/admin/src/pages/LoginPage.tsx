import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clearAuthData, getAuthData, login } from '@/lib/api'
import { getSettings } from '@/lib/settings'
import { ADMIN_LOCALES, localeLabel, setLocale } from '@/lib/i18n'
import { LocaleFlag } from '@/components/shared/LocaleFlag'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const inputCls =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'

export default function LoginPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const settings = getSettings()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getAuthData()) navigate('/', { replace: true })
  }, [navigate])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const auth = await login({ email, password })
      if (!auth.is_admin) {
        clearAuthData()
        setError(t('login.notAdmin', { defaultValue: '需要管理员账号登录' }))
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

      <div className="mx-auto flex w-full flex-col justify-center gap-6 sm:w-[350px] md:w-[420px] lg:p-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="m-0 text-2xl font-bold sm:text-3xl">{settings.title || 'XBoard'}</h1>
          <p className="m-0 text-sm text-muted-foreground" />
        </div>

        <div className="rounded-xl border bg-card p-4 text-card-foreground shadow sm:p-6">
          <div className="flex flex-col gap-2 text-left">
            <h1 className="m-0 text-xl font-semibold tracking-tight sm:text-2xl">
              {t('auth.signIn.title')}
            </h1>
            <p className="m-0 text-sm text-muted-foreground">{t('auth.signIn.description')}</p>
          </div>
          <div className="grid gap-6">
            <form className="flex flex-col gap-4" onSubmit={onSubmit}>
              <div className="flex flex-col gap-4">
                <div>
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
                    className={`mt-2 ${inputCls}`}
                    required
                  />
                </div>
                <div>
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('auth.signIn.password')}
                  </Label>
                  <div className="relative mt-2 rounded-md">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder={t('auth.signIn.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputCls}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-0 py-2 text-sm font-normal text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    {t('auth.signIn.forgotPassword')}
                  </button>
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <button
                  type="submit"
                  className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? t('common.saving') : t('auth.signIn.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
