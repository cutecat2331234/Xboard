import { useCallback, useEffect, useMemo, useState } from 'react'
import type { TFunction } from 'i18next'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/api-errors'
import { adminApi, buildQuery, fetchJsonList, postJson } from '@/lib/api'
import { inputCls, textareaCls } from '@/lib/form-styles'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

type TemplateListItem = {
  name?: string
  label?: string
  customized?: boolean
}

type TemplateDetail = {
  name?: string
  label?: string
  subject?: string
  content?: string
}

export function MailTemplatePanel({ t, embedded }: { t: TFunction; embedded?: boolean }) {
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [list, setList] = useState<TemplateListItem[]>([])
  const [selected, setSelected] = useState('')
  const [detail, setDetail] = useState<TemplateDetail>({})
  const [savedDetail, setSavedDetail] = useState<TemplateDetail>({})
  const [loading, setLoading] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)

  const dirty = useMemo(
    () =>
      (detail.subject ?? '') !== (savedDetail.subject ?? '') ||
      (detail.content ?? '') !== (savedDetail.content ?? ''),
    [detail, savedDetail],
  )

  const loadList = useCallback(() => {
    fetchJsonList('/mail/template/list')
      .then((rows) => {
        const items = rows as TemplateListItem[]
        setList(items)
        if (!selected && items[0]?.name) setSelected(items[0].name!)
      })
      .catch((e) => toastApiError(e, toast, t, t('common.error')))
  }, [selected, t, toast])

  const loadDetail = useCallback((name: string) => {
    if (!name) return
    setLoading(true)
    adminApi<{ data?: TemplateDetail }>(`/mail/template/get${buildQuery({ name })}`)
      .then((res) => {
        const d = res.data ?? {}
        setDetail(d)
        setSavedDetail(d)
      })
      .catch((e) => {
        toastApiError(e, toast, t, t('common.error'))
        setDetail({})
        setSavedDetail({})
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (selected) loadDetail(selected)
  }, [selected, loadDetail])

  async function saveTemplate() {
    try {
      await postJson('/mail/template/save', {
        name: detail.name ?? selected,
        subject: detail.subject,
        content: detail.content,
      })
      toast.success(t('settings.email_template.save_success'))
      setSavedDetail({ ...detail })
      loadList()
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    }
  }

  async function resetTemplate() {
    const ok = await confirm({
      title: t('settings.email_template.reset_title'),
      description: t('settings.email_template.reset_description'),
      confirmLabel: t('settings.email_template.reset_confirm'),
      cancelLabel: t('settings.email_template.cancel'),
    })
    if (!ok) return
    try {
      await postJson('/mail/template/reset', { name: selected })
      toast.success(t('settings.email_template.reset_success'))
      loadDetail(selected)
      loadList()
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    }
  }

  async function sendTestMail() {
    if (!selected) return
    if (dirty) {
      toast.error(t('settings.email_template.save_before_test'))
      return
    }
    setTesting(true)
    try {
      await postJson('/mail/template/test', {
        name: selected,
        ...(testEmail.trim() ? { email: testEmail.trim() } : {}),
      })
      toast.success(t('settings.email_template.test_success'))
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    } finally {
      setTesting(false)
    }
  }

  async function onSelectTemplate(name: string) {
    if (dirty && name !== selected) {
      const ok = await confirm({
        title: t('settings.email_template.discard_title'),
        description: t('settings.email_template.discard_description'),
        confirmLabel: t('settings.email_template.discard_confirm'),
        cancelLabel: t('settings.email_template.cancel'),
        destructive: false,
      })
      if (!ok) return
    }
    setSelected(name)
  }

  return (
    <div className={embedded ? 'flex flex-col xb-stack-4' : 'mt-6 rounded-md border p-4'}>
      {!embedded ? (
        <div className="xb-stack-15">
          <h4 className="text-base font-medium">{t('settings.email_template.title')}</h4>
          <p className="text-sm text-muted-foreground">{t('settings.email_template.description')}</p>
        </div>
      ) : null}
      <div className="xb-stack-4">
        <div className="xb-stack-2">
          <Label>{t('settings.email_template.title')}</Label>
          <select
            className={inputCls}
            value={selected}
            onChange={(e) => void onSelectTemplate(e.target.value)}
          >
            {list.map((item) => (
              <option key={item.name} value={item.name}>
                {t(`mailTemplate.labels.${item.name}`, { defaultValue: item.label ?? item.name ?? '' })}
                {item.customized ? ` (${t('settings.email_template.customized')})` : ''}
              </option>
            ))}
          </select>
        </div>
        {dirty ? (
          <p className="text-xs text-amber-600">{t('settings.email_template.unsaved')}</p>
        ) : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <>
            <p className="text-[0.8rem] text-muted-foreground">{t('settings.email_template.override_hint')}</p>
            <div className="xb-stack-2">
              <Label>{t('settings.email_template.subject')}</Label>
              <input
                className={inputCls}
                placeholder={t('settings.email_template.subject_placeholder')}
                value={detail.subject ?? ''}
                onChange={(e) => setDetail((d) => ({ ...d, subject: e.target.value }))}
              />
            </div>
            <div className="xb-stack-2">
              <Label>{t('settings.email_template.content')}</Label>
              <textarea
                className={`${textareaCls} min-h-[160px] font-mono text-xs`}
                value={detail.content ?? ''}
                onChange={(e) => setDetail((d) => ({ ...d, content: e.target.value }))}
              />
            </div>
            <div className="flex flex-col xb-stack-2 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col xb-stack-2">
                <Label>{t('settings.email_template.test_dialog_title')}</Label>
                <input
                  className={inputCls}
                  type="email"
                  value={testEmail}
                  placeholder={t('settings.email_template.test_email_placeholder')}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <Button type="button" size="sm" variant="outline" disabled={testing} onClick={sendTestMail}>
                {testing ? t('settings.email_template.sending') : t('settings.email_template.send_test')}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={saveTemplate}>
                {t('settings.email_template.save')}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={resetTemplate}>
                {t('settings.email_template.reset')}
              </Button>
            </div>
          </>
        )}
      </div>
      <ConfirmDialog />
    </div>
  )
}
