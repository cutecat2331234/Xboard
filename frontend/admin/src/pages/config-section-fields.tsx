import { useState } from 'react'
import type { TFunction } from 'i18next'
import { toast } from 'sonner'
import { postJson } from '@/lib/api'
import { ConfigFormSelect } from '@/components/shared/ConfigFormSelect'
import { inputCls } from '@/lib/form-styles'
import { SubscribeTemplateSection } from '@/components/SubscribeTemplateSection'
import { MailTemplatePanel } from '@/pages/MailTemplatePanel'
import { TelegramConfigFields } from '@/pages/TelegramConfigFields'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type UpdateFn = (sec: string, key: string, value: unknown) => void

type FieldProps = {
  t: TFunction
  config: Record<string, Record<string, unknown>>
  update: UpdateFn
  FormField: React.ComponentType<{
    label: string
    description?: string
    value: string
    placeholder?: string
    onChange: (v: string) => void
    compactLabel?: boolean
  }>
  FormTextarea: React.ComponentType<{
    label: string
    description?: string
    value: string
    placeholder?: string
    onChange: (v: string) => void
    compactLabel?: boolean
  }>
  SwitchField: React.ComponentType<{
    label: string
    description?: string
    checked: boolean
    onChange: (v: boolean) => void
    flat?: boolean
    compactLabel?: boolean
  }>
}

export function ConfigSectionFields({
  section,
  t,
  config,
  update,
  FormField,
  FormTextarea,
  SwitchField,
}: FieldProps & { section: string }) {
  const [emailTab, setEmailTab] = useState('settings')
  const safe = config.safe ?? {}
  const email = config.email ?? {}
  const telegram = config.telegram ?? {}
  const site = config.site ?? {}
  const app = config.app ?? {}
  const tpl = config.subscribe_template ?? {}

  if (section === 'safe') {
    return (
      <>
        <SwitchField
          label={t('settings.safe.form.emailVerify.label')}
          description={t('settings.safe.form.emailVerify.description')}
          checked={Boolean(safe.email_verify)}
          onChange={(v) => update('safe', 'email_verify', v)}
        />
        <SwitchField
          label={t('settings.safe.form.gmailLimit.label')}
          description={t('settings.safe.form.gmailLimit.description')}
          checked={Boolean(safe.email_gmail_limit_enable)}
          onChange={(v) => update('safe', 'email_gmail_limit_enable', v)}
        />
        <SwitchField
          label={t('settings.safe.form.safeMode.label')}
          description={t('settings.safe.form.safeMode.description')}
          checked={Boolean(safe.safe_mode_enable)}
          onChange={(v) => update('safe', 'safe_mode_enable', v)}
        />
        <FormField
          label={t('settings.safe.form.securePath.label')}
          description={t('settings.safe.form.securePath.description')}
          value={String(safe.secure_path ?? '')}
          placeholder={t('settings.safe.form.securePath.placeholder')}
          onChange={(v) => update('safe', 'secure_path', v)}
        />
        <SwitchField
          label={t('settings.safe.form.emailWhitelist.label')}
          description={t('settings.safe.form.emailWhitelist.description')}
          checked={Boolean(safe.email_whitelist_enable)}
          onChange={(v) => update('safe', 'email_whitelist_enable', v)}
        />
        {safe.email_whitelist_enable ? (
          <FormTextarea
            label={t('settings.safe.form.emailWhitelist.suffixes.label')}
            description={t('settings.safe.form.emailWhitelist.suffixes.description')}
            value={
              Array.isArray(safe.email_whitelist_suffix)
                ? safe.email_whitelist_suffix.join('\n')
                : String(safe.email_whitelist_suffix ?? '')
            }
            placeholder={t('settings.safe.form.emailWhitelist.suffixes.placeholder')}
            onChange={(v) => update('safe', 'email_whitelist_suffix', v)}
          />
        ) : null}
        <SwitchField
          label={t('settings.safe.form.captcha.enable.label')}
          description={t('settings.safe.form.captcha.enable.description')}
          checked={Boolean(safe.captcha_enable)}
          onChange={(v) => update('safe', 'captcha_enable', v)}
        />
        {safe.captcha_enable ? (
          <>
            <ConfigFormSelect
              label={t('settings.safe.form.captcha.type.label')}
              description={t('settings.safe.form.captcha.type.description')}
              value={String(safe.captcha_type ?? 'recaptcha')}
              onChange={(v) => update('safe', 'captcha_type', v)}
              options={[
                { value: 'recaptcha', label: t('settings.safe.form.captcha.type.options.recaptcha') },
                { value: 'recaptcha-v3', label: t('settings.safe.form.captcha.type.options.recaptcha-v3') },
                { value: 'turnstile', label: t('settings.safe.form.captcha.type.options.turnstile') },
              ]}
            />
          </>
        ) : null}
        {safe.captcha_enable && (safe.captcha_type === 'recaptcha' || safe.captcha_type === undefined) ? (
          <>
            <FormField
              label={t('settings.safe.form.captcha.recaptcha.key.label')}
              description={t('settings.safe.form.captcha.recaptcha.key.description')}
              value={String(safe.recaptcha_key ?? '')}
              placeholder={t('settings.safe.form.captcha.recaptcha.key.placeholder')}
              onChange={(v) => update('safe', 'recaptcha_key', v)}
            />
            <FormField
              label={t('settings.safe.form.captcha.recaptcha.siteKey.label')}
              description={t('settings.safe.form.captcha.recaptcha.siteKey.description')}
              value={String(safe.recaptcha_site_key ?? '')}
              placeholder={t('settings.safe.form.captcha.recaptcha.siteKey.placeholder')}
              onChange={(v) => update('safe', 'recaptcha_site_key', v)}
            />
          </>
        ) : null}
        {safe.captcha_enable && safe.captcha_type === 'recaptcha-v3' ? (
          <>
            <FormField
              label={t('settings.safe.form.captcha.recaptcha_v3.secretKey.label')}
              description={t('settings.safe.form.captcha.recaptcha_v3.secretKey.description')}
              value={String(safe.recaptcha_v3_secret_key ?? '')}
              placeholder={t('settings.safe.form.captcha.recaptcha_v3.secretKey.placeholder')}
              onChange={(v) => update('safe', 'recaptcha_v3_secret_key', v)}
            />
            <FormField
              label={t('settings.safe.form.captcha.recaptcha_v3.siteKey.label')}
              description={t('settings.safe.form.captcha.recaptcha_v3.siteKey.description')}
              value={String(safe.recaptcha_v3_site_key ?? '')}
              placeholder={t('settings.safe.form.captcha.recaptcha_v3.siteKey.placeholder')}
              onChange={(v) => update('safe', 'recaptcha_v3_site_key', v)}
            />
            <FormField
              label={t('settings.safe.form.captcha.recaptcha_v3.scoreThreshold.label')}
              description={t('settings.safe.form.captcha.recaptcha_v3.scoreThreshold.description')}
              value={String(safe.recaptcha_v3_score_threshold ?? '')}
              placeholder={t('settings.safe.form.captcha.recaptcha_v3.scoreThreshold.placeholder')}
              onChange={(v) => update('safe', 'recaptcha_v3_score_threshold', v)}
            />
          </>
        ) : null}
        {safe.captcha_enable && safe.captcha_type === 'turnstile' ? (
          <>
            <FormField
              label={t('settings.safe.form.captcha.turnstile.secretKey.label')}
              description={t('settings.safe.form.captcha.turnstile.secretKey.description')}
              value={String(safe.turnstile_secret_key ?? '')}
              placeholder={t('settings.safe.form.captcha.turnstile.secretKey.placeholder')}
              onChange={(v) => update('safe', 'turnstile_secret_key', v)}
            />
            <FormField
              label={t('settings.safe.form.captcha.turnstile.siteKey.label')}
              description={t('settings.safe.form.captcha.turnstile.siteKey.description')}
              value={String(safe.turnstile_site_key ?? '')}
              placeholder={t('settings.safe.form.captcha.turnstile.siteKey.placeholder')}
              onChange={(v) => update('safe', 'turnstile_site_key', v)}
            />
          </>
        ) : null}
        <SwitchField
          label={t('settings.safe.form.registerLimit.enable.label')}
          description={t('settings.safe.form.registerLimit.enable.description')}
          checked={Boolean(safe.register_limit_by_ip_enable)}
          onChange={(v) => update('safe', 'register_limit_by_ip_enable', v)}
        />
        {safe.register_limit_by_ip_enable ? (
          <>
            <FormField
              label={t('settings.safe.form.registerLimit.count.label')}
              description={t('settings.safe.form.registerLimit.count.description')}
              value={String(safe.register_limit_count ?? '')}
              placeholder={t('settings.safe.form.registerLimit.count.placeholder')}
              onChange={(v) => update('safe', 'register_limit_count', v)}
            />
            <FormField
              label={t('settings.safe.form.registerLimit.expire.label')}
              description={t('settings.safe.form.registerLimit.expire.description')}
              value={String(safe.register_limit_expire ?? '')}
              placeholder={t('settings.safe.form.registerLimit.expire.placeholder')}
              onChange={(v) => update('safe', 'register_limit_expire', v)}
            />
          </>
        ) : null}
        <SwitchField
          label={t('settings.safe.form.passwordLimit.enable.label')}
          description={t('settings.safe.form.passwordLimit.enable.description')}
          checked={Boolean(safe.password_limit_enable)}
          onChange={(v) => update('safe', 'password_limit_enable', v)}
        />
        {safe.password_limit_enable ? (
          <>
            <FormField
              label={t('settings.safe.form.passwordLimit.count.label')}
              description={t('settings.safe.form.passwordLimit.count.description')}
              value={String(safe.password_limit_count ?? '')}
              placeholder={t('settings.safe.form.passwordLimit.count.placeholder')}
              onChange={(v) => update('safe', 'password_limit_count', v)}
            />
            <FormField
              label={t('settings.safe.form.passwordLimit.expire.label')}
              description={t('settings.safe.form.passwordLimit.expire.description')}
              value={String(safe.password_limit_expire ?? '')}
              placeholder={t('settings.safe.form.passwordLimit.expire.placeholder')}
              onChange={(v) => update('safe', 'password_limit_expire', v)}
            />
          </>
        ) : null}
      </>
    )
  }

  if (section === 'email') {
    return (
      <Tabs value={emailTab} onValueChange={setEmailTab}>
        <TabsList>
          <TabsTrigger value="settings">{t('settings.email.tab_settings')}</TabsTrigger>
          <TabsTrigger value="templates">{t('settings.email.tab_templates')}</TabsTrigger>
        </TabsList>
        <TabsContent value="settings" className="xb-stack-4">
          <FormField
            compactLabel
            label={t('settings.email.email_host.title')}
            description={t('settings.email.email_host.description')}
            value={String(email.email_host ?? '')}
            onChange={(v) => update('email', 'email_host', v)}
          />
          <FormField
            compactLabel
            label={t('settings.email.email_port.title')}
            description={t('settings.email.email_port.description')}
            value={String(email.email_port ?? '')}
            onChange={(v) => update('email', 'email_port', v)}
          />
          <ConfigFormSelect
            compactLabel
            label={t('settings.email.email_encryption.title')}
            description={t('settings.email.email_encryption.description')}
            value={String(email.email_encryption ?? '')}
            onChange={(v) => update('email', 'email_encryption', v)}
            options={[
              { value: '', label: t('settings.email.email_encryption.none') },
              { value: 'ssl', label: t('settings.email.email_encryption.ssl') },
              { value: 'tls', label: t('settings.email.email_encryption.tls') },
            ]}
          />
          <FormField
            compactLabel
            label={t('settings.email.email_username.title')}
            description={t('settings.email.email_username.description')}
            value={String(email.email_username ?? '')}
            onChange={(v) => update('email', 'email_username', v)}
          />
          <FormField
            compactLabel
            label={t('settings.email.email_password.title')}
            description={t('settings.email.email_password.description')}
            value={String(email.email_password ?? '')}
            onChange={(v) => update('email', 'email_password', v)}
          />
          <FormField
            compactLabel
            label={t('settings.email.email_from.title')}
            description={t('settings.email.email_from.description')}
            value={String(email.email_from_address ?? '')}
            onChange={(v) => update('email', 'email_from_address', v)}
          />
          <SwitchField
            compactLabel
            label={t('settings.email.remind_mail.title')}
            description={t('settings.email.remind_mail.description')}
            checked={Boolean(email.remind_mail_enable)}
            onChange={(v) => update('email', 'remind_mail_enable', v)}
          />
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                postJson('/config/testSendMail')
                  .then(() => toast.success(t('settings.email.test.success')))
                  .catch((e) => toast.error(e instanceof Error ? e.message : t('settings.email.test.error')))
              }
            >
              {t('settings.email.test.title')}
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="templates">
          <MailTemplatePanel t={t} embedded />
        </TabsContent>
      </Tabs>
    )
  }

  if (section === 'telegram') {
    return (
      <TelegramConfigFields
        t={t}
        telegram={telegram}
        update={update}
        FormField={FormField}
        SwitchField={SwitchField}
      />
    )
  }

  if (section === 'app') {
    return (
      <>
        <FormField
          label={t('settings.app.windows.version.title')}
          description={t('settings.app.windows.version.description')}
          value={String(app.windows_version ?? '')}
          placeholder={t('settings.app.common.placeholder')}
          onChange={(v) => update('app', 'windows_version', v)}
        />
        <FormField
          label={t('settings.app.windows.download.title')}
          description={t('settings.app.windows.download.description')}
          value={String(app.windows_download_url ?? '')}
          placeholder={t('settings.app.common.placeholder')}
          onChange={(v) => update('app', 'windows_download_url', v)}
        />
        <FormField
          label={t('settings.app.macos.version.title')}
          description={t('settings.app.macos.version.description')}
          value={String(app.macos_version ?? '')}
          placeholder={t('settings.app.common.placeholder')}
          onChange={(v) => update('app', 'macos_version', v)}
        />
        <FormField
          label={t('settings.app.macos.download.title')}
          description={t('settings.app.macos.download.description')}
          value={String(app.macos_download_url ?? '')}
          placeholder={t('settings.app.common.placeholder')}
          onChange={(v) => update('app', 'macos_download_url', v)}
        />
        <FormField
          label={t('settings.app.android.version.title')}
          description={t('settings.app.android.version.description')}
          value={String(app.android_version ?? '')}
          placeholder={t('settings.app.common.placeholder')}
          onChange={(v) => update('app', 'android_version', v)}
        />
        <FormField
          label={t('settings.app.android.download.title')}
          description={t('settings.app.android.download.description')}
          value={String(app.android_download_url ?? '')}
          placeholder={t('settings.app.common.placeholder')}
          onChange={(v) => update('app', 'android_download_url', v)}
        />
      </>
    )
  }

  if (section === 'subscribe_template') {
    return <SubscribeTemplateSection t={t} tpl={tpl} update={update} />
  }

  return null
}
