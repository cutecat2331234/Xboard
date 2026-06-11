import { useCallback, useEffect, useState } from 'react'
import type { TFunction } from 'i18next'
import { toast } from 'sonner'
import { adminApi, buildQuery, fetchJsonList, postJson } from '@/lib/api'
import { inputCls, textareaCls } from '@/lib/form-styles'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

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
  const [list, setList] = useState<TemplateListItem[]>([])
  const [selected, setSelected] = useState('')
  const [detail, setDetail] = useState<TemplateDetail>({})
  const [loading, setLoading] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)

  const loadList = useCallback(() => {
    fetchJsonList('/mail/template/list')
      .then((rows) => {
        const items = rows as TemplateListItem[]
        setList(items)
        if (!selected && items[0]?.name) setSelected(items[0].name!)
      })
      .catch(() => setList([]))
  }, [selected])

  const loadDetail = useCallback((name: string) => {
    if (!name) return
    setLoading(true)
    adminApi<{ data?: TemplateDetail }>(`/mail/template/get${buildQuery({ name })}`)
      .then((res) => setDetail(res.data ?? {}))
      .catch(() => setDetail({}))
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
      toast.success(t('common.success'))
      loadList()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function resetTemplate() {
    try {
      await postJson('/mail/template/reset', { name: selected })
      toast.success(t('common.success'))
      loadDetail(selected)
      loadList()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function sendTestMail() {
    if (!selected) return
    setTesting(true)
    try {
      await postJson('/mail/template/test', {
        name: selected,
        ...(testEmail.trim() ? { email: testEmail.trim() } : {}),
      })
      toast.success(t('settings.email.test.success'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('settings.email.test.error'))
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className={embedded ? 'flex flex-col gap-4' : 'mt-6 rounded-md border p-4'}>
      {!embedded ? (
        <h4 className="mb-4 text-base font-medium">{t('settings.email.templates.title')}</h4>
      ) : null}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>{t('settings.email.templates.select')}</Label>
          <select className={inputCls} value={selected} onChange={(e) => setSelected(e.target.value)}>
            {list.map((item) => (
              <option key={item.name} value={item.name}>
                {item.label ?? item.name}
                {item.customized ? ' *' : ''}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label>{t('settings.email.templates.subject')}</Label>
              <input
                className={inputCls}
                value={detail.subject ?? ''}
                onChange={(e) => setDetail((d) => ({ ...d, subject: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('settings.email.templates.content')}</Label>
              <textarea
                className={`${textareaCls} min-h-[160px] font-mono text-xs`}
                value={detail.content ?? ''}
                onChange={(e) => setDetail((d) => ({ ...d, content: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-2">
                <Label>{t('settings.email.templates.testEmail')}</Label>
                <input
                  className={inputCls}
                  type="email"
                  value={testEmail}
                  placeholder={t('settings.email.templates.testEmailPlaceholder')}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <Button type="button" size="sm" variant="outline" disabled={testing} onClick={sendTestMail}>
                {testing
                  ? t('settings.email.test.sending')
                  : t('settings.email.templates.test')}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={saveTemplate}>
                {t('common.save')}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={resetTemplate}>
                {t('settings.email.templates.reset')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
