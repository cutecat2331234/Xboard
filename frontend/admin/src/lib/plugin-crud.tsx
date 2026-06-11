import type { ColumnDef } from '@tanstack/react-table'
import { fetchPaginatedList, postJson } from '@/lib/api'
import { inputCls, textareaCls } from '@/lib/form-styles'
import type {
  PluginAdminCrudColumn,
  PluginAdminCrudFormField,
  PluginAdminCrudSchema,
  PluginConfigField,
} from '@/lib/plugin-types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export type NormalizedPluginCrudFormField = {
  key: string
  field: PluginConfigField
}

export function normalizePluginCrudFormFields(
  form?: PluginAdminCrudSchema['form'],
): NormalizedPluginCrudFormField[] {
  if (!form) return []
  if (Array.isArray(form)) {
    return form
      .filter((item): item is PluginAdminCrudFormField => Boolean(item.name))
      .map((item) => ({
        key: item.name,
        field: {
          type: item.type,
          label: item.label,
          placeholder: item.placeholder,
          description: item.description,
          value: item.value,
          options: item.options,
          required: item.required,
          hidden: item.hidden,
          readonly: item.readonly,
        },
      }))
  }
  return Object.entries(form).map(([key, field]) => ({ key, field }))
}

export function hasPluginCrudTypedForm(schema: PluginAdminCrudSchema): boolean {
  return normalizePluginCrudFormFields(schema.form).some((item) => !item.field.hidden)
}

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
  const formFields = normalizePluginCrudFormFields(schema.form)
  const columns = schema.columns?.length
    ? schema.columns
    : formFields.map(({ key, field }) => ({
        key,
        title: field.label ?? key,
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
  for (const { key, field } of normalizePluginCrudFormFields(schema.form)) {
    values[key] = field.value ?? (field.type === 'boolean' ? false : '')
  }
  return values
}

type PluginCrudFormFieldsProps = {
  fields: NormalizedPluginCrudFormField[]
  values: Record<string, unknown>
  idField?: string
  onChange: (key: string, value: unknown) => void
}

export function PluginCrudFormFields({
  fields,
  values,
  idField = 'id',
  onChange,
}: PluginCrudFormFieldsProps) {
  const visibleFields = fields.filter((item) => !item.field.hidden)

  return (
    <div className="flex flex-col gap-4 py-1">
      {visibleFields.map(({ key, field }) => {
        const label = field.label ?? key
        const value = values[key]
        const isIdField = key === idField
        const readOnly = Boolean(field.readonly || (isIdField && value != null && value !== ''))
        const fieldType = field.type ?? 'string'

        return (
          <div key={key} className="flex flex-col gap-2">
            {fieldType === 'boolean' ? (
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor={`plugin-crud-${key}`}>{label}</Label>
                  {field.description ? (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  ) : null}
                </div>
                <Switch
                  id={`plugin-crud-${key}`}
                  checked={Boolean(value)}
                  disabled={readOnly}
                  onCheckedChange={(checked) => onChange(key, checked)}
                />
              </div>
            ) : (
              <>
                <Label htmlFor={`plugin-crud-${key}`}>
                  {label}
                  {field.required ? <span className="text-destructive"> *</span> : null}
                </Label>
                {fieldType === 'select' && field.options?.length ? (
                  <select
                    id={`plugin-crud-${key}`}
                    className={inputCls}
                    value={value == null ? '' : String(value)}
                    disabled={readOnly}
                    onChange={(e) => {
                      const raw = e.target.value
                      const matched = field.options?.find((opt) => String(opt.value) === raw)
                      onChange(key, matched?.value ?? raw)
                    }}
                  >
                    {field.options.map((opt) => (
                      <option key={String(opt.value)} value={String(opt.value)}>
                        {opt.label ?? opt.value}
                      </option>
                    ))}
                  </select>
                ) : fieldType === 'textarea' ? (
                  <textarea
                    id={`plugin-crud-${key}`}
                    className={textareaCls}
                    value={value == null ? '' : String(value)}
                    placeholder={field.placeholder}
                    readOnly={readOnly}
                    onChange={(e) => onChange(key, e.target.value)}
                  />
                ) : (
                  <Input
                    id={`plugin-crud-${key}`}
                    type={fieldType === 'number' ? 'number' : 'text'}
                    value={value == null ? '' : String(value)}
                    placeholder={field.placeholder}
                    readOnly={readOnly}
                    onChange={(e) =>
                      onChange(
                        key,
                        fieldType === 'number' && e.target.value !== ''
                          ? Number(e.target.value)
                          : e.target.value,
                      )
                    }
                  />
                )}
                {field.description && fieldType !== 'boolean' ? (
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                ) : null}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
