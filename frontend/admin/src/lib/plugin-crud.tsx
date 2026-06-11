import type { ColumnDef } from '@tanstack/react-table'
import { fetchPaginatedList, postJson } from '@/lib/api'
import type { PluginAdminCrudColumn, PluginAdminCrudSchema } from '@/lib/plugin-types'
import { Badge } from '@/components/ui/badge'

export type PluginCrudListParams = {
  current?: number
  pageSize?: number
  search?: string
  sort_field?: string
  sort_order?: 'asc' | 'desc'
}

export function resolvePluginCrudApiPath(
  pluginCode: string,
  subpath: string,
  action: 'list' | 'save' | 'delete',
  schema?: PluginAdminCrudSchema,
): string | null {
  const configured = schema?.api?.[action]
  if (configured) return configured

  if (!pluginCode || !subpath) return null
  const suffix = action === 'list' ? 'fetch' : action
  return `/plugin/${pluginCode}/${subpath}/${suffix}`
}

export async function fetchPluginCrudList(
  listPath: string,
  params: PluginCrudListParams = {},
) {
  return fetchPaginatedList<Record<string, unknown>>(listPath, {
    current: params.current,
    pageSize: params.pageSize,
    search: params.search,
    sort_field: params.sort_field,
    sort_order: params.sort_order,
  })
}

export async function savePluginCrudRecord(savePath: string, payload: Record<string, unknown>) {
  return postJson(savePath, payload)
}

export async function deletePluginCrudRecord(
  deletePath: string,
  payload: Record<string, unknown>,
) {
  return postJson(deletePath, payload)
}

function formatDatetime(value: unknown): string {
  if (value == null || value === '') return '—'
  const numeric = Number(value)
  const date = Number.isFinite(numeric)
    ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
    : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function renderCrudCell(column: PluginAdminCrudColumn, value: unknown) {
  switch (column.type) {
    case 'datetime':
      return <span className="text-sm text-muted-foreground">{formatDatetime(value)}</span>
    case 'boolean':
      return <Badge variant={value ? 'default' : 'outline'}>{value ? 'Yes' : 'No'}</Badge>
    case 'tag': {
      const option = column.options?.find((opt) => opt.value === String(value))
      return (
        <Badge
          variant={
            (option?.variant as 'default' | 'secondary' | 'destructive' | 'outline') ?? 'outline'
          }
        >
          {option?.label ?? String(value ?? '—')}
        </Badge>
      )
    }
    case 'number':
      return <span className="tabular-nums">{value == null ? '—' : String(value)}</span>
    default:
      return <span>{value == null ? '—' : String(value)}</span>
  }
}

export function buildPluginCrudColumns(
  schema: PluginAdminCrudSchema,
  options?: {
    onEdit?: (row: Record<string, unknown>) => void
    onDelete?: (row: Record<string, unknown>) => void
  },
): ColumnDef<Record<string, unknown>, unknown>[] {
  const columns = schema.columns?.length
    ? schema.columns
    : Object.keys(schema.form ?? {}).map((key) => ({
        key,
        title: schema.form?.[key]?.label ?? key,
        type: 'string' as const,
      }))

  const defs: ColumnDef<Record<string, unknown>, unknown>[] = columns.map((column) => ({
    accessorKey: column.key,
    header: column.title ?? column.key,
    size: column.width,
    cell: ({ row }) => renderCrudCell(column, row.original[column.key]),
  }))

  const showActions = Boolean(
    (schema.actions?.edit && options?.onEdit) || (schema.actions?.delete && options?.onDelete),
  )

  if (showActions) {
    defs.push({
      id: 'actions',
      header: () => null,
      size: 120,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          {schema.actions?.edit && options?.onEdit ? (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => options.onEdit?.(row.original)}
            >
              Edit
            </button>
          ) : null}
          {schema.actions?.delete && options?.onDelete ? (
            <button
              type="button"
              className="text-xs text-destructive hover:underline"
              onClick={() => options.onDelete?.(row.original)}
            >
              Delete
            </button>
          ) : null}
        </div>
      ),
    })
  }

  return defs
}

export function defaultPluginCrudFormValues(
  schema: PluginAdminCrudSchema,
): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(schema.form ?? {})) {
    values[key] = field.value ?? (field.type === 'boolean' ? false : '')
  }
  return values
}
