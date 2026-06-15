import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import { getAdminApiPrefix } from '@/lib/settings'
import {
  buildPluginRoute,
  fetchPluginMenuPageHtml,
  normalizePluginPath,
  openPluginBackendPage,
  resolvePluginMenuBackendPageUrl,
  resolvePluginMenuIframeSrc,
  resolvePluginMenuPageApiUrl,
} from '@/lib/plugin-menus'
import type { PluginAdminMenu, PluginRow } from '@/lib/plugin-types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

type Props = {
  plugin: PluginRow
  menu: PluginAdminMenu
}

export function PluginMenuPanel({ plugin, menu }: Props) {
  const { t } = useTranslation()
  const pluginCode = plugin.code ?? ''
  const menuPath = normalizePluginPath(menu.path)
  const apiPrefix = getAdminApiPrefix()

  const iframeSrc = useMemo(
    () => resolvePluginMenuIframeSrc(pluginCode, menu),
    [pluginCode, menu],
  )

  const backendPageUrl = useMemo(
    () => resolvePluginMenuBackendPageUrl(pluginCode, menu, { apiPrefix }),
    [pluginCode, menu, apiPrefix],
  )

  const pageApiUrl = useMemo(
    () =>
      iframeSrc
        ? null
        : resolvePluginMenuPageApiUrl(pluginCode, menuPath, { apiPrefix }),
    [iframeSrc, pluginCode, menuPath, apiPrefix],
  )

  const [embeddedHtml, setEmbeddedHtml] = useState<string | null>(null)
  const [loadingEmbed, setLoadingEmbed] = useState(Boolean(pageApiUrl))
  const [pageProbeFailed, setPageProbeFailed] = useState(false)
  const [openingBackend, setOpeningBackend] = useState(false)

  const [iframeLoadFailed, setIframeLoadFailed] = useState(false)

  useEffect(() => {
    if (iframeSrc || !pageApiUrl) {
      setLoadingEmbed(false)
      return
    }

    let cancelled = false
    setLoadingEmbed(true)
    setEmbeddedHtml(null)
    setPageProbeFailed(false)

    void fetchPluginMenuPageHtml(pageApiUrl).then((html) => {
      if (!cancelled) {
        setEmbeddedHtml(html)
        const failed = !html
        setPageProbeFailed(failed)
        if (failed) {
          toast.error(t('plugin.runtime.pluginContentUnavailable'))
        }
        setLoadingEmbed(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [iframeSrc, pageApiUrl, t])

  async function handleOpenBackendPage() {
    if (!backendPageUrl) return
    setOpeningBackend(true)
    try {
      const ok = await openPluginBackendPage(backendPageUrl)
      if (!ok) {
        toast.error(t('plugin.runtime.pluginContentUnavailable'))
      }
    } finally {
      setOpeningBackend(false)
    }
  }

  if (iframeSrc || embeddedHtml) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('plugin.runtime.embeddedContentTitle')}</CardTitle>
          {menu.description ? (
            <CardDescription>{menu.description}</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="p-0 pt-0">
          {iframeLoadFailed ? (
            <p className="p-4 text-sm text-muted-foreground">{t('plugin.runtime.pluginContentUnavailable')}</p>
          ) : null}
          <iframe
            title={menu.title ?? menuPath}
            src={iframeSrc ?? undefined}
            srcDoc={embeddedHtml ?? undefined}
            className="h-[min(70vh,720px)] w-full rounded-b-lg border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={() => setIframeLoadFailed(false)}
            onError={() => {
              setIframeLoadFailed(true)
              toast.error(t('plugin.runtime.pluginContentUnavailable'))
            }}
          />
        </CardContent>
      </Card>
    )
  }

  if (loadingEmbed) {
    return (
      <p className="text-sm text-muted-foreground">{t('plugin.runtime.loadingPluginContent')}</p>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{menu.title ?? menuPath}</CardTitle>
        <CardDescription>
          {menu.description || t('plugin.runtime.pluginMenuPageDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <dl className="space-y-2 text-muted-foreground">
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-foreground">{t('plugin.runtime.pluginLabel')}:</dt>
              <dd>{plugin.name ?? pluginCode}</dd>
            </div>
            {menuPath ? (
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-foreground">{t('plugin.runtime.menuPathLabel')}:</dt>
                <dd>
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    {buildPluginRoute(pluginCode, menuPath)}
                  </code>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <div className="flex flex-wrap gap-2">
          {backendPageUrl ? (
            <Button type="button" disabled={openingBackend} onClick={() => void handleOpenBackendPage()}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t('plugin.runtime.openBackendPage')}
            </Button>
          ) : null}
          <Button variant="outline" asChild>
            <Link to={buildPluginRoute(pluginCode)}>{t('plugin.runtime.backToOverview')}</Link>
          </Button>
        </div>

        {pageProbeFailed && backendPageUrl ? (
          <p className="text-xs text-muted-foreground">
            {t('plugin.runtime.pluginContentUnavailable')}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
