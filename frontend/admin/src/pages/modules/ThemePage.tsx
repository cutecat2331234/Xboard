import { useCallback, useEffect, useRef, useState } from 'react'
import { Trash2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  adminApi,
  fetchThemes,
  postJson,
  saveConfig,
  type ThemeItem,
} from '@/lib/api'
import { textareaCls } from '@/lib/form-styles'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export default function ThemePage() {
  const { t } = useTranslation()
  const [themes, setThemes] = useState<ThemeItem[]>([])
  const [active, setActive] = useState('Xboard')
  const [loading, setLoading] = useState(true)
  const [configOpen, setConfigOpen] = useState(false)
  const [configTheme, setConfigTheme] = useState('')
  const [configJson, setConfigJson] = useState('{}')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetchThemes()
      .then(({ themes: list, active: current }) => {
        setThemes(list)
        setActive(current)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  async function switchTheme(name: string) {
    try {
      await saveConfig({ frontend_theme: name })
      toast.success(t('common.success'))
      setActive(name)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function openConfig(theme: ThemeItem) {
    const name = String(theme.name ?? theme.theme ?? '')
    try {
      const result = await postJson<Record<string, unknown>>('/theme/getThemeConfig', { name })
      setConfigTheme(name)
      setConfigJson(JSON.stringify(result ?? {}, null, 2))
      setConfigOpen(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function saveThemeConfig() {
    setSaving(true)
    try {
      const config = JSON.parse(configJson)
      await postJson('/theme/saveThemeConfig', { name: configTheme, config })
      toast.success(t('common.success'))
      setConfigOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function uploadTheme(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    try {
      await adminApi('/theme/upload', { method: 'POST', body: formData })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function deleteTheme(name: string) {
    if (active === name) {
      toast.error(t('theme.card.delete.error.active', { defaultValue: '不能删除当前使用的主题' }))
      return
    }
    if (!window.confirm(t('theme.card.delete.description'))) return
    try {
      await postJson('/theme/delete', { name })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  return (
    <div>
      <header className="mb-8">
        <div className="mb-2">
          <h1 className="text-2xl font-bold tracking-tight">{t('theme.title')}</h1>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">{t('theme.description')}</div>
          <Button
            variant="outline"
            size="sm"
            className="ml-4 h-8 shrink-0 px-3 text-xs"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('theme.upload.button')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadTheme(file)
              e.target.value = ''
            }}
          />
        </div>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : (
        <section className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {themes.map((theme) => {
            const name = String(theme.name ?? theme.theme ?? 'Xboard')
            const version = String(theme.version ?? '1.0.0')
            const isActive = active === name
            const canDelete = Boolean(theme.can_delete)
            return (
              <Card
                key={name}
                className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-md"
              >
                <div className="relative z-10 h-full bg-background transition-colors">
                  <CardHeader>
                    <CardTitle className="font-semibold leading-none tracking-tight">{name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      <div className="space-y-2">
                        <div>{String(theme.description ?? name)}</div>
                        <div className="text-sm text-muted-foreground">
                          {t('theme.card.version', { version })}
                        </div>
                      </div>
                    </p>
                  </CardHeader>
                  <CardContent className="flex items-center justify-end space-x-3">
                    {canDelete ? (
                      <Button
                        variant="outline"
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteTheme(name)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('theme.card.delete.button')}
                      </Button>
                    ) : null}
                    <Button variant="outline" type="button" onClick={() => openConfig(theme)}>
                      {t('theme.card.configureTheme')}
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      disabled={isActive}
                      onClick={() => switchTheme(name)}
                    >
                      {isActive ? t('theme.card.currentTheme') : t('theme.card.switchTheme', { defaultValue: '切换主题' })}
                    </Button>
                  </CardContent>
                </div>
              </Card>
            )
          })}
        </section>
      )}

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('theme.config.title', { defaultValue: '主题配置' })} — {configTheme}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label>{t('theme.config.json', { defaultValue: '配置 JSON' })}</Label>
            <textarea
              className={`${textareaCls} min-h-[240px] font-mono text-xs`}
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              {t('common.cancel', { defaultValue: '取消' })}
            </Button>
            <Button onClick={saveThemeConfig} disabled={saving}>
              {t('common.save', { defaultValue: '保存' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
