import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="h-svh">
      <div className="m-auto flex h-full w-full flex-col items-center justify-center gap-2">
        <h1 className="text-[7rem] font-bold leading-tight">404</h1>
        <span className="font-medium">{t('errors.notFoundTitle', { defaultValue: 'Page not found' })}</span>
        <p className="text-center text-muted-foreground">
          {t('errors.notFoundDesc', {
            defaultValue: "The page you're looking for does not exist or may have been removed.",
          })}
        </p>
        <div className="mt-6 flex gap-4">
          <Button variant="outline" className="h-9 px-4 py-2" onClick={() => navigate(-1)}>
            {t('common.back', { defaultValue: 'Go Back' })}
          </Button>
          <Button className="h-9 px-4 py-2 shadow" onClick={() => navigate('/')}>
            {t('errors.backHome', { defaultValue: 'Back to Home' })}
          </Button>
        </div>
      </div>
    </div>
  )
}
