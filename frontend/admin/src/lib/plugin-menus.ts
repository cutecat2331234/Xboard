import type { PluginAdminMenu, PluginNavGroup, PluginNavItem, PluginRow } from '@/lib/plugin-types'

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
): { title?: string; description?: string } | null {
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
