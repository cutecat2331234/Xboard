import type { TFunction } from 'i18next'

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

/** 与 7001 实机一致：仅 bot_token / bot_enable / discuss_link（无 Webhook 区块） */
export function TelegramConfigFields({ t, telegram, update, FormField, SwitchField }: Props) {
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
    </>
  )
}
