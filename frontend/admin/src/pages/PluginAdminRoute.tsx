import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { adminApi, buildQuery, postJson } from '@/lib/api'
import { inputCls } from '@/lib/form-styles'
import {
  buildPluginRoute,
  findAdminCrud,
  findAdminMenu,
  normalizePluginPath,
} from '@/lib/plugin-menus'
import type { PluginConfigField, PluginRow } from '@/lib/plugin-types'
import { usePluginList } from '@/lib/use-plugin-list'
import { PluginCrudPanel } from '@/components/plugin/PluginCrudPanel'
import { PluginMenuPanel } from '@/components/plugin/PluginMenuPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

function resolveTab(subpath: string, hasConfig: boolean): 'overview' | 'settings' {
  if (subpath === 'settings' && hasConfig) return 'settings'
  return 'overview'
}

export default function PluginAdminRoute() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const params = useParams<{ code: string; '*': string }>()
  const pluginCode = params.code ?? ''
  const subpath = normalizePluginPath(params['*'])
  const { plugins, loading } = usePluginList()

  const plugin = useMemo(
    () => plugins.find((row) => row.code === pluginCode),
    [plugins, pluginCode],
  )

  const hasConfig = Boolean(plugin?.config && Object.keys(plugin.config).length > 0)
  const adminMenu = findAdminMenu(plugin, subpath)
  const adminCrud = findAdminCrud(plugin, subpath)
  const showOverview = !adminMenu && !adminCrud && (!subpath || (subpath === 'settings' && hasConfig))
  const showUnknownPage = Boolean(subpath && !adminMenu && !adminCrud && subpath !== 'settings')
  const tab = resolveTab(subpath, hasConfig)

  const pageTitle =
    adminCrud?.title ||
    adminMenu?.title ||
    plugin?.name ||
    pluginCode ||
    t('plugin.title')

  const pageDescription =
    adminCrud?.description ||
    adminMenu?.description ||
    plugin?.description ||
    t('plugin.runtime.pageDescription')

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (!plugin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('plugin.runtime.notFoundTitle')}</CardTitle>
          <CardDescription>
            {t('plugin.runtime.notFoundDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link to="/config/plugin">{t('plugin.runtime.backToPluginList')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!plugin.is_enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{plugin.name ?? pluginCode}</CardTitle>
          <CardDescription>
            {t('plugin.runtime.disabledDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link to="/config/plugin">{t('plugin.runtime.backToPluginList')}</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">{pageTitle}</h2>
          {plugin.version ? (
            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium">
              v{plugin.version}
            </span>
          ) : null}
          {adminMenu?.label ? (
            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium">
              {adminMenu.label}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{pageDescription}</p>
      </div>

      {adminCrud ? (
        <PluginCrudPanel plugin={plugin} subpath={subpath} schema={adminCrud} />
      ) : null}

      {adminMenu ? <PluginMenuPanel plugin={plugin} menu={adminMenu} /> : null}

      {showUnknownPage ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('plugin.runtime.pageNotFoundTitle')}</CardTitle>
            <CardDescription>
              {t('plugin.runtime.pageNotFoundDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate(buildPluginRoute(pluginCode))}>
              {t('plugin.runtime.backToOverview')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {showOverview ? (
        <Tabs
          value={tab}
          onValueChange={(value) => {
            navigate(
              value === 'settings'
                ? buildPluginRoute(pluginCode, 'settings')
                : buildPluginRoute(pluginCode),
            )
          }}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="overview">
              {t('plugin.runtime.overview')}
            </TabsTrigger>
            {hasConfig ? (
              <TabsTrigger value="settings">
                {t('plugin.runtime.settings')}
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('plugin.runtime.metadataTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <span className="font-medium">{t('plugin.author')}: </span>
                  {plugin.author ?? '—'}
                </div>
                <div>
                  <span className="font-medium">Code: </span>
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">{plugin.code}</code>
                </div>
                <div>
                  <span className="font-medium">{t('plugin.runtime.version')}: </span>
                  {plugin.version ?? '—'}
                </div>
                <div>
                  <span className="font-medium">{t('plugin.runtime.status')}: </span>
                  {plugin.is_enabled
                    ? t('plugin.status.enabled')
                    : t('plugin.status.disabled')}
                </div>
              </CardContent>
            </Card>

            {plugin.admin_menus?.length ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t('plugin.runtime.menuDeclarationTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plugin.admin_menus.map((menu) => {
                    const path = normalizePluginPath(menu.path)
                    if (!path || !plugin.code) return null
                    return (
                      <div key={`${plugin.code}:${menu.id ?? path}`} className="rounded-lg border bg-muted/20 p-4 text-sm">
                        <div className="font-medium">{menu.title ?? path}</div>
                        {menu.description ? (
                          <p className="mt-1 text-muted-foreground">{menu.description}</p>
                        ) : null}
                        <div className="mt-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={buildPluginRoute(plugin.code, path)}>
                              {t('plugin.runtime.openMenuPage')}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ) : null}

            {plugin.readme ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t('plugin.button.readme')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{plugin.readme}</pre>
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          {hasConfig ? (
            <TabsContent value="settings">
              <PluginSettingsPanel plugin={plugin} />
            </TabsContent>
          ) : null}
        </Tabs>
      ) : null}
    </div>
  )
}

function PluginSettingsPanel({ plugin }: { plugin: PluginRow }) {
  const { t } = useTranslation()
  const [fields, setFields] = useState<Record<string, PluginConfigField>>({})
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadConfig = useCallback(async () => {
    if (!plugin.code) return
    setLoading(true)
    try {
      const res = await adminApi<{ data?: Record<string, PluginConfigField> }>(
        `/plugin/config${buildQuery({ code: plugin.code })}`,
      )
      const nextFields = res.data ?? plugin.config ?? {}
      setFields(nextFields)
      const nextValues: Record<string, unknown> = {}
      for (const [key, field] of Object.entries(nextFields)) {
        nextValues[key] = field.value
      }
      setValues(nextValues)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [plugin.code, plugin.config, t])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  async function saveConfig() {
    if (!plugin.code) return
    setSaving(true)
    try {
      await postJson('/plugin/config', { code: plugin.code, config: values })
      toast.success(t('common.success'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('plugin.button.config')}</CardTitle>
        <CardDescription>{plugin.name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(fields).map(([key, field]) => (
          <div key={key} className="flex flex-col gap-2">
            <Label>{field.label ?? key}</Label>
            {field.type === 'select' && field.options?.length ? (
              <select
                className={inputCls}
                value={String(values[key] ?? '')}
                onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
              >
                {field.options.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label ?? opt.value}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={inputCls}
                value={String(values[key] ?? '')}
                placeholder={field.placeholder}
                onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            )}
            {field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}
          </div>
        ))}
        {Object.keys(fields).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('plugin.config.empty')}
          </p>
        ) : (
          <Button onClick={saveConfig} disabled={saving}>
            {t('common.save')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
