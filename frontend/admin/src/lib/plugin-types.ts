export type PluginAdminMenu = {
  id?: string
  title?: string
  label?: string
  path?: string
  icon?: string
  description?: string
  /** External URL to embed in an iframe. */
  url?: string
  /** Plugin asset path (under `/plugins/{code}/`) to embed in an iframe. */
  embed?: string
  /** Backend route segment served under `/plugin/{code}/`. */
  component?: string
}

export type PluginConfigField = {
  type?: string
  label?: string
  placeholder?: string
  description?: string
  value?: unknown
  options?: Array<{ label?: string; value?: string | number }>
  required?: boolean
  hidden?: boolean
  readonly?: boolean
}

export type PluginAdminCrudFormFieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'textarea'

export type PluginAdminCrudFormField = PluginConfigField & {
  name: string
  type?: PluginAdminCrudFormFieldType | string
}

export type PluginAdminCrudColumnType = 'string' | 'number' | 'boolean' | 'datetime' | 'tag'

export type PluginAdminCrudColumn = {
  key: string
  title?: string
  type?: PluginAdminCrudColumnType
  sortable?: boolean
  searchable?: boolean
  width?: number
  options?: Array<{ value: string; label?: string; variant?: string }>
}

export type PluginAdminCrudApi = {
  list?: string
  save?: string
  delete?: string
}

export type PluginAdminCrudActions = {
  create?: boolean
  edit?: boolean
  delete?: boolean
}

export type PluginAdminCrudSchema = {
  version?: number
  title?: string
  description?: string
  id_field?: string
  api?: PluginAdminCrudApi
  columns?: PluginAdminCrudColumn[]
  form?: Record<string, PluginConfigField> | PluginAdminCrudFormField[]
  actions?: PluginAdminCrudActions
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
  admin_crud?: Record<string, PluginAdminCrudSchema> | null
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
