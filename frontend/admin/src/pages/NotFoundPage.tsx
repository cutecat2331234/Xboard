import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-8xl font-bold tracking-tight text-muted-foreground">404</h1>
      <h2 className="mt-4 text-2xl font-semibold">{t('notFound.title')}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t('notFound.description')}</p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          {t('notFound.goBack')}
        </Button>
        <Button onClick={() => navigate('/')}>{t('notFound.backToHome')}</Button>
      </div>
    </div>
  )
}
