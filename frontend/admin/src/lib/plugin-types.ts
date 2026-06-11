export type PluginAdminMenu = {
  id?: string
  title?: string
  label?: string
  path?: string
  icon?: string
  description?: string
}

export type PluginConfigField = {
  type?: string
  label?: string
  placeholder?: string
  description?: string
  value?: unknown
  options?: Array<{ label?: string; value?: string | number }>
}

export type PluginRow = {
  code?: string
  name?: string
  description?: string
  version?: string
  author?: string
  type?: string
  is_installed?: boolean
  is_enabled?: boolean
  is_protected?: boolean
  need_upgrade?: boolean
  can_be_deleted?: boolean
  config?: Record<string, PluginConfigField>
  readme?: string
  admin_menus?: PluginAdminMenu[] | null
  admin_crud?: Record<string, { title?: string; description?: string }> | null
}

export type PluginNavItem = {
  id: string
  path: string
  title: string
  label?: string
  icon?: string
  pluginCode: string
}

export type PluginNavGroup = {
  id: string
  title: string
  label?: string
  pluginCode: string
  pluginType?: string
  items: PluginNavItem[]
}
