import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthData, login } from '@/lib/api'
import { getSettings } from '@/lib/settings'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const navigate = useNavigate()
  const settings = getSettings()
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('')
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
      await login({ email, password })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          {settings.logo ? (
            <img src={settings.logo} alt="" className="mx-auto mb-2 h-12 w-12 object-contain" />
          ) : null}
          <CardTitle>{t('auth.signIn.title')}</CardTitle>
          <CardDescription>{t('auth.signIn.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.signIn.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.signIn.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.signIn.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.signIn.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : t('auth.signIn.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
