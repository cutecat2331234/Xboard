import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FileText,
  Package,
  Power,
  Search,
  Settings,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { adminApi, buildQuery, fetchJsonList, postJson } from '@/lib/api'
import type { PluginConfigField, PluginRow } from '@/lib/plugin-types'
import { PluginCrudFormFields } from '@/lib/plugin-crud'
import { buildPluginRoute } from '@/lib/plugin-menus'
import { invalidatePluginListCache } from '@/lib/use-plugin-list'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

const TYPE_ORDER = ['feature', 'payment'] as const

function typeLabel(type: string, t: (key: string) => string) {
  return t(`plugin.type.${type}`)
}

function orderedTypes(plugins: PluginRow[]) {
  const found = [...new Set(plugins.map((p) => p.type).filter(Boolean))] as string[]
  const ordered = TYPE_ORDER.filter((t) => found.includes(t))
  for (const t of found) {
    if (!ordered.includes(t)) ordered.push(t)
  }
  return ordered
}

export default function PluginPage() {
  const { t } = useTranslation()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [plugins, setPlugins] = useState<PluginRow[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('feature')
  const [loading, setLoading] = useState(true)
  const [configOpen, setConfigOpen] = useState(false)
  const [configCode, setConfigCode] = useState('')
  const [configFields, setConfigFields] = useState<Record<string, PluginConfigField>>({})
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({})
  const [configSaving, setConfigSaving] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [readmeOpen, setReadmeOpen] = useState(false)
  const [readmePlugin, setReadmePlugin] = useState<PluginRow | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    invalidatePluginListCache()
    setLoading(true)
    fetchJsonList('/plugin/getPlugins')
      .then((rows) => setPlugins(rows as PluginRow[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  async function openConfig(code: string) {
    try {
      const res = await adminApi<{ data?: Record<string, PluginConfigField> }>(
        `/plugin/config${buildQuery({ code })}`,
      )
      const fields = res.data ?? {}
      setConfigFields(fields)
      const values: Record<string, unknown> = {}
      for (const [key, field] of Object.entries(fields)) {
        values[key] = field.value
      }
      setConfigValues(values)
      setConfigCode(code)
      setConfigOpen(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function saveConfig() {
    setConfigSaving(true)
    try {
      await postJson('/plugin/config', { code: configCode, config: configValues })
      toast.success(t('common.success'))
      setConfigOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setConfigSaving(false)
    }
  }

  async function uploadPlugin(file: File) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error(t('plugin.upload.error.format'))
      return
    }
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      await adminApi('/plugin/upload', { method: 'POST', body: formData })
      toast.success(t('plugin.messages.uploadSuccess'))
      setUploadOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('plugin.messages.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  async function pluginAction(code: string, action: 'enable' | 'disable' | 'install' | 'uninstall') {
    try {
      await postJson(`/plugin/${action}`, { code })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function upgradePlugin(code: string) {
    if (!(await confirm({ description: t('plugin.upgrade.description'), destructive: false }))) return
    try {
      await postJson('/plugin/upgrade', { code })
      toast.success(t('plugin.messages.upgradeSuccess'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('plugin.messages.upgradeError'))
    }
  }

  async function deletePlugin(code: string) {
    if (
      !(await confirm(
        t('plugin.delete.title'),
        t('plugin.delete.description'),
        { confirmLabel: t('plugin.delete.button') },
      ))
    )
      return
    try {
      await postJson('/plugin/delete', { code })
      toast.success(t('plugin.messages.deleteSuccess'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('plugin.messages.deleteError'))
    }
  }

  const types = useMemo(() => orderedTypes(plugins), [plugins])

  const filtered = useMemo(() => {
    let list = plugins
    if (tab && tab !== 'all') list = list.filter((p) => p.type === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          String(p.name ?? '').toLowerCase().includes(q) ||
          String(p.description ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [plugins, search, tab])

  return (
    <div>
      <div className="mb-8 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-9 shadow-sm focus-visible:ring-1"
              placeholder={t('plugin.search.placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="h-8 shrink-0 px-3 text-xs"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t('plugin.upload.button')}
            </Button>
            <input
              ref={uploadRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadPlugin(file)
                e.target.value = ''
              }}
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList>
            {types.map((type) => (
              <TabsTrigger key={type} value={type}>
                <div className="flex items-center gap-2">
                  <span>{typeLabel(type, t)}</span>
                </div>
              </TabsTrigger>
            ))}
            <TabsTrigger value="all">{t('plugin.tabs.all')}</TabsTrigger>
          </TabsList>

          {types.map((type) => (
            <TabsContent key={type} value={type} className="mt-6">
              <PluginGrid
                plugins={tab === type ? filtered : []}
                loading={loading}
                t={t}
                onAction={pluginAction}
                onConfig={openConfig}
                onUpgrade={upgradePlugin}
                onDelete={deletePlugin}
                onReadme={(plugin) => {
                  setReadmePlugin(plugin)
                  setReadmeOpen(true)
                }}
              />
            </TabsContent>
          ))}
          <TabsContent value="all" className="mt-6">
            <PluginGrid
              plugins={tab === 'all' ? filtered : []}
              loading={loading}
              t={t}
              onAction={pluginAction}
              onConfig={openConfig}
              onUpgrade={upgradePlugin}
              onDelete={deletePlugin}
              onReadme={(plugin) => {
                setReadmePlugin(plugin)
                setReadmeOpen(true)
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('plugin.upload.title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('plugin.upload.description')}</p>
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-6 py-10 text-center transition-colors hover:border-muted-foreground/50"
            onClick={() => uploadRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files?.[0]
              if (file) void uploadPlugin(file)
            }}
          >
            <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('plugin.upload.dragText')}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={(e) => {
                  e.stopPropagation()
                  uploadRef.current?.click()
                }}
              >
                {t('plugin.upload.clickText')}
              </button>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{t('plugin.upload.supportText')}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('plugin.button.config')} — {configCode}
            </DialogTitle>
          </DialogHeader>
          {Object.keys(configFields).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('plugin.config.empty')}</p>
          ) : (
            <PluginCrudFormFields
              fields={Object.entries(configFields).map(([key, field]) => ({ key, field }))}
              values={configValues}
              onChange={(key, value) => setConfigValues((v) => ({ ...v, [key]: value }))}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveConfig} disabled={configSaving}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={readmeOpen} onOpenChange={setReadmeOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('plugin.readme.title')}
              {readmePlugin?.name ? ` — ${readmePlugin.name}` : ''}
            </DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
            {readmePlugin?.readme ?? ''}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReadmeOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  )
}

function PluginGrid({
  plugins,
  loading,
  t,
  onAction,
  onConfig,
  onUpgrade,
  onDelete,
  onReadme,
}: {
  plugins: PluginRow[]
  loading: boolean
  t: (key: string) => string
  onAction: (code: string, action: 'enable' | 'disable' | 'install' | 'uninstall') => void
  onConfig: (code: string) => void
  onUpgrade: (code: string) => void
  onDelete: (code: string) => void
  onReadme: (plugin: PluginRow) => void
}) {
  if (loading) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  return (
    <div className="space-y-4">
      {plugins.map((plugin) => (
        <Card
          key={String(plugin.code)}
          className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-md"
        >
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {plugin.code ? (
                  <Link
                    to={buildPluginRoute(plugin.code)}
                    className="truncate text-base font-semibold hover:underline"
                  >
                    {plugin.name}
                  </Link>
                ) : (
                  <h3 className="truncate text-base font-semibold">{plugin.name}</h3>
                )}
                {plugin.type ? (
                  <div className="inline-flex items-center rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-xs font-semibold text-primary">
                    {typeLabel(plugin.type, t)}
                  </div>
                ) : null}
                {plugin.is_enabled ? (
                  <div className="inline-flex items-center rounded-md border border-transparent bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/10">
                    {t('plugin.status.enabled')}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                {plugin.is_protected ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                    <Shield className="h-3 w-3" />
                  </div>
                ) : null}
                <button
                  type="button"
                  className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                  title={t('plugin.button.readme')}
                  disabled={!plugin.readme}
                  onClick={() => onReadme(plugin)}
                >
                  <FileText className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                <code className="rounded bg-muted px-1 py-0.5 text-xs">{plugin.code}</code>
              </div>
              {plugin.version ? <span>v{plugin.version}</span> : null}
              {plugin.author ? (
                <span>
                  {t('plugin.author')}: {plugin.author}
                </span>
              ) : null}
            </div>
            {plugin.description ? (
              <p
                className="mb-3 overflow-hidden text-ellipsis text-sm text-muted-foreground"
                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
              >
                {plugin.description}
              </p>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 rounded-md px-2 text-xs"
                disabled={!plugin.is_installed}
                onClick={() => plugin.code && onConfig(plugin.code)}
              >
                <Settings className="mr-1 h-3 w-3" />
                {t('plugin.button.config')}
              </Button>
              {plugin.need_upgrade && plugin.code ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-md px-2 text-xs"
                  onClick={() => onUpgrade(plugin.code!)}
                >
                  {t('plugin.upgrade.button')}
                </Button>
              ) : null}
              {plugin.is_installed ? (
                plugin.is_enabled ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 rounded-md px-2 text-xs"
                    onClick={() => plugin.code && onAction(plugin.code, 'disable')}
                  >
                    <Power className="mr-1 h-3 w-3" />
                    {t('plugin.button.disable')}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-md px-2 text-xs"
                    onClick={() => plugin.code && onAction(plugin.code, 'enable')}
                  >
                    <Power className="mr-1 h-3 w-3" />
                    {t('plugin.button.enable')}
                  </Button>
                )
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-md px-2 text-xs"
                  onClick={() => plugin.code && onAction(plugin.code, 'install')}
                >
                  <Power className="mr-1 h-3 w-3" />
                  {t('plugin.button.install')}
                </Button>
              )}
              {plugin.is_installed ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:text-destructive"
                  disabled={Boolean(plugin.is_protected)}
                  onClick={() => plugin.code && onAction(plugin.code, 'uninstall')}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  {t('plugin.uninstall.button')}
                </Button>
              ) : null}
              {plugin.can_be_deleted && !plugin.is_installed && plugin.code ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(plugin.code!)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  {t('plugin.delete.button')}
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
