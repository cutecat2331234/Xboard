import { getAuthData } from '@/lib/api'
import type {
  PluginAdminCrudSchema,
  PluginAdminMenu,
  PluginNavGroup,
  PluginNavItem,
  PluginRow,
} from '@/lib/plugin-types'

export function normalizePluginPath(path?: string): string {
  if (!path) return ''
  return path.trim().replace(/^\/+/, '').replace(/\/+$/, '')
}

export function buildPluginRoute(code: string, menuPath?: string): string {
  const normalized = normalizePluginPath(menuPath)
  return normalized ? `/plugins/${code}/${normalized}` : `/plugins/${code}`
}

export function findAdminMenu(plugin: PluginRow | undefined, subpath: string): PluginAdminMenu | null {
  const normalized = normalizePluginPath(subpath)
  if (!normalized || !plugin?.admin_menus?.length) return null
  return plugin.admin_menus.find((menu) => normalizePluginPath(menu.path) === normalized) ?? null
}

export function findAdminCrud(
  plugin: PluginRow | undefined,
  subpath: string,
): PluginAdminCrudSchema | null {
  const normalized = normalizePluginPath(subpath)
  if (!normalized || !plugin?.admin_crud) return null
  return plugin.admin_crud[normalized] ?? null
}

function buildPluginMenuItems(plugin: PluginRow): PluginNavItem[] {
  return (plugin.admin_menus ?? [])
    .map((menu) => {
      const path = normalizePluginPath(menu.path)
      if (!path || !plugin.code) return null
      return {
        id: `plugin-menu:${plugin.code}:${menu.id ?? path}`,
        path: buildPluginRoute(plugin.code, path),
        title: menu.title ?? path,
        label: menu.label,
        icon: menu.icon,
        pluginCode: plugin.code,
      } satisfies PluginNavItem
    })
    .filter((item): item is PluginNavItem => item !== null)
}

/** Build sidebar groups from installed + enabled plugins that declare admin_menus. */
export function buildPluginNavGroups(plugins: PluginRow[]): PluginNavGroup[] {
  return plugins
    .filter((plugin) => plugin.is_installed && plugin.is_enabled)
    .map((plugin) => {
      const items = buildPluginMenuItems(plugin)
      if (!items.length || !plugin.code) return null
      return {
        id: `plugin-group:${plugin.code}`,
        title: plugin.name ?? plugin.code,
        label: plugin.version ? `v${plugin.version}` : undefined,
        pluginCode: plugin.code,
        pluginType: plugin.type,
        items,
      } satisfies PluginNavGroup
    })
    .filter((group): group is PluginNavGroup => group !== null)
    .sort((a, b) => a.title.localeCompare(b.title))
}

export function isExternalHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim())
}

export function resolvePluginAssetUrl(pluginCode: string, assetPath: string): string {
  const normalized = assetPath.trim().replace(/^\/+/, '')
  return `/plugins/${pluginCode}/${normalized}`
}

/** Direct iframe source from menu metadata (external URL or plugin asset path). */
export function resolvePluginMenuIframeSrc(
  pluginCode: string,
  menu: PluginAdminMenu,
): string | null {
  if (!pluginCode) return null

  const externalUrl = menu.url?.trim()
  if (externalUrl && isExternalHttpUrl(externalUrl)) {
    return externalUrl
  }

  const embedPath = menu.embed?.trim()
  if (embedPath) {
    return resolvePluginAssetUrl(pluginCode, embedPath)
  }

  return null
}

/** Admin API URL for a plugin-provided page (Authorization header required — no token in query). */
export function resolvePluginMenuBackendPageUrl(
  pluginCode: string,
  menu: PluginAdminMenu,
  options: { apiPrefix: string },
): string | null {
  if (!pluginCode) return null

  const menuPath = normalizePluginPath(menu.path)
  const component = menu.component?.trim()

  let apiPath: string | null = null
  if (component) {
    apiPath = component.startsWith('/')
      ? component
      : `/plugin/${pluginCode}/${normalizePluginPath(component)}`
  } else if (menuPath) {
    apiPath = `/plugin/${pluginCode}/page?${new URLSearchParams({ path: menuPath }).toString()}`
  }

  if (!apiPath) return null
  return `${options.apiPrefix}${apiPath}`
}

/** Same as backend page URL; used to probe HTML responses for inline embedding. */
export function resolvePluginMenuPageApiUrl(
  pluginCode: string,
  menuPath: string,
  options: { apiPrefix: string },
): string | null {
  if (!pluginCode || !menuPath) return null
  const apiPath = `/plugin/${pluginCode}/page?${new URLSearchParams({ path: menuPath }).toString()}`
  return `${options.apiPrefix}${apiPath}`
}

export async function fetchPluginMenuPageHtml(pageApiUrl: string): Promise<string | null> {
  const headers = new Headers({ Accept: 'text/html,application/json' })
  const auth = getAuthData()
  if (auth) headers.set('Authorization', auth)

  try {
    const response = await fetch(pageApiUrl, { headers })
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('text/html')) {
      return response.text()
    }

    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as { data?: { html?: string }; html?: string }
      return payload.data?.html ?? payload.html ?? null
    }
  } catch {
    return null
  }

  return null
}

/** Open plugin backend HTML in a new tab using Authorization header (no token in URL). */
export async function openPluginBackendPage(pageApiUrl: string): Promise<boolean> {
  const html = await fetchPluginMenuPageHtml(pageApiUrl)
  if (!html) return false

  const popup = window.open('', '_blank', 'noopener,noreferrer')
  if (!popup) return false

  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  return true
}

export function isPluginAdminPath(pathname: string): boolean {
  return pathname === '/plugins' || pathname.startsWith('/plugins/')
}

export function pluginTitleForPath(pathname: string, plugins: PluginRow[]): string | null {
  const match = pathname.match(/^\/plugins\/([^/]+)/)
  if (!match) return null
  const code = decodeURIComponent(match[1])
  const plugin = plugins.find((p) => p.code === code)
  if (!plugin) return code

  const subpath = normalizePluginPath(pathname.replace(/^\/plugins\/[^/]+\/?/, ''))
  if (subpath === 'settings') {
    return `${plugin.name ?? code} — Settings`
  }
  const menu = findAdminMenu(plugin, subpath)
  if (menu?.title) return menu.title
  const crud = findAdminCrud(plugin, subpath)
  if (crud?.title) return crud.title
  return plugin.name ?? code
}
