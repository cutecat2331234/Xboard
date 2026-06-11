import { useState } from 'react'
import type { TFunction } from 'i18next'
import { toast } from 'sonner'
import { setTelegramWebhook } from '@/lib/api'
import { Button } from '@/components/ui/button'

type UpdateFn = (sec: string, key: string, value: unknown) => void

type Props = {
  t: TFunction
  telegram: Record<string, unknown>
  update: UpdateFn
  FormField: React.ComponentType<{
    label: string
    description?: string
    value: string
    placeholder?: string
    onChange: (v: string) => void
  }>
  SwitchField: React.ComponentType<{
    label: string
    description?: string
    checked: boolean
    onChange: (v: boolean) => void
    flat?: boolean
  }>
}

export function TelegramConfigFields({ t, telegram, update, FormField, SwitchField }: Props) {
  const [webhookLoading, setWebhookLoading] = useState(false)

  const handleSetWebhook = () => {
    const token = String(telegram.telegram_bot_token ?? '').trim()
    if (!token) {
      toast.error(t('settings.telegram.bot_token.description'))
      return
    }
    setWebhookLoading(true)
    setTelegramWebhook(token)
      .then(() => toast.success(t('settings.telegram.webhook.success')))
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error', { defaultValue: '操作失败' })))
      .finally(() => setWebhookLoading(false))
  }

  return (
    <>
      <FormField
        label={t('settings.telegram.bot_token.title')}
        description={t('settings.telegram.bot_token.description')}
        value={String(telegram.telegram_bot_token ?? '')}
        placeholder={t('settings.telegram.bot_token.placeholder')}
        onChange={(v) => update('telegram', 'telegram_bot_token', v)}
      />
      <SwitchField
        flat
        label={t('settings.telegram.bot_enable.title')}
        description={t('settings.telegram.bot_enable.description')}
        checked={Boolean(telegram.telegram_bot_enable)}
        onChange={(v) => update('telegram', 'telegram_bot_enable', v)}
      />
      <FormField
        label={t('settings.telegram.discuss_link.title')}
        description={t('settings.telegram.discuss_link.description')}
        value={String(telegram.telegram_discuss_link ?? '')}
        placeholder={t('settings.telegram.discuss_link.placeholder')}
        onChange={(v) => update('telegram', 'telegram_discuss_link', v)}
      />
      <div className="space-y-2 pt-2">
        <p className="text-sm font-medium">{t('settings.telegram.webhook.title')}</p>
        <p className="text-sm text-muted-foreground">{t('settings.telegram.webhook.description')}</p>
        <Button type="button" variant="outline" size="sm" onClick={handleSetWebhook} disabled={webhookLoading}>
          {webhookLoading ? t('settings.telegram.webhook.setting') : t('settings.telegram.webhook.button')}
        </Button>
      </div>
    </>
  )
}
