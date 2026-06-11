import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { JsonEditor, type JsonEditorHandle } from '@/components/JsonEditor'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { inputCls } from '@/lib/form-styles'
import {
  buildPluginCrudColumns,
  defaultPluginCrudFormValues,
  deletePluginCrudRecord,
  fetchPluginCrudList,
  resolvePluginCrudApiPath,
  savePluginCrudRecord,
} from '@/lib/plugin-crud'
import type { PluginAdminCrudSchema, PluginRow } from '@/lib/plugin-types'
import { toast } from 'sonner'

type Props = {
  plugin: PluginRow
  subpath: string
  schema: PluginAdminCrudSchema
}

export function PluginCrudPanel({ plugin, subpath, schema }: Props) {
  const { t } = useTranslation()
  const pluginCode = plugin.code ?? ''
  const idField = schema.id_field ?? 'id'
  const listPath = resolvePluginCrudApiPath(pluginCode, subpath, 'list', schema)
  const savePath = resolvePluginCrudApiPath(pluginCode, subpath, 'save', schema)
  const deletePath = resolvePluginCrudApiPath(pluginCode, subpath, 'delete', schema)

  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(Boolean(listPath))
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<Record<string, unknown>>(() => defaultPluginCrudFormValues(schema))
  const [editing, setEditing] = useState(false)
  const editorRef = useRef<JsonEditorHandle>(null)

  const pageSize = 20
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const searchableKeys = useMemo(
    () => schema.columns?.filter((column) => column.searchable).map((column) => column.key) ?? [],
    [schema.columns],
  )

  const loadRows = useCallback(async () => {
    if (!listPath) return
    setLoading(true)
    try {
      const result = await fetchPluginCrudList(listPath, {
        current: page,
        pageSize,
        search: search.trim() || undefined,
      })
      setRows(result.data)
      setTotal(result.total)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [listPath, page, pageSize, search, t])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const beginCreate = useCallback(() => {
    setDraft(defaultPluginCrudFormValues(schema))
    setEditing(true)
  }, [schema])

  const beginEdit = useCallback((row: Record<string, unknown>) => {
    setDraft(row)
    setEditing(true)
  }, [])

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      if (!deletePath) return
      const id = row[idField]
      if (id == null) return
      try {
        await deletePluginCrudRecord(deletePath, { [idField]: id })
        toast.success(t('common.success'))
        await loadRows()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('common.error'))
      }
    },
    [deletePath, idField, loadRows, t],
  )

  const columns = useMemo<ColumnDef<Record<string, unknown>, unknown>[]>(
    () =>
      buildPluginCrudColumns(schema, {
        onEdit: schema.actions?.edit ? beginEdit : undefined,
        onDelete: schema.actions?.delete ? handleDelete : undefined,
      }),
    [schema, beginEdit, handleDelete],
  )

  async function handleSave() {
    if (!savePath) return
    setSaving(true)
    try {
      const raw = editorRef.current?.getValue() ?? JSON.stringify(draft, null, 2)
      const payload = JSON.parse(raw) as Record<string, unknown>
      await savePluginCrudRecord(savePath, payload)
      toast.success(t('common.success'))
      setEditing(false)
      setDraft(defaultPluginCrudFormValues(schema))
      await loadRows()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const showList = Boolean(listPath)
  const showEditor = Boolean(savePath && (editing || !showList))

  return (
    <div className="space-y-6">
      {showList ? (
        <Card>
          <CardHeader>
            <CardTitle>{schema.title ?? subpath}</CardTitle>
            {schema.description ? <CardDescription>{schema.description}</CardDescription> : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              {searchableKeys.length > 0 ? (
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder={t('plugin.runtime.searchPlaceholder', { defaultValue: 'Search...' })}
                  className={`h-8 max-w-sm ${inputCls}`}
                />
              ) : (
                <div />
              )}
              {schema.actions?.create && savePath ? (
                <Button size="sm" onClick={beginCreate}>
                  <Plus className="mr-1 h-4 w-4" />
                  {t('plugin.runtime.create', { defaultValue: 'Create' })}
                </Button>
              ) : null}
            </div>
            <DataTable
              columns={columns}
              data={rows}
              loading={loading}
              pageSize={pageSize}
              alwaysShowPagination
              totalItems={total}
              pageIndex={page - 1}
              pageCount={pageCount}
              onPageIndexChange={(idx) => setPage(idx + 1)}
            />
          </CardContent>
        </Card>
      ) : null}

      {showEditor ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {editing
                ? t('plugin.runtime.edit', { defaultValue: 'Edit record' })
                : t('plugin.runtime.schemaEditor', { defaultValue: 'Record editor' })}
            </CardTitle>
            <CardDescription>
              {savePath ? (
                <code className="text-xs">{savePath}</code>
              ) : (
                t('plugin.runtime.crudPageDescription')
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <JsonEditor
              key={editing ? `edit:${String(draft[idField] ?? 'new')}` : 'schema'}
              ref={editorRef}
              value={editing ? draft : defaultPluginCrudFormValues(schema)}
              readOnly={false}
              height="320px"
            />
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {t('common.save')}
              </Button>
              {editing ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false)
                    setDraft(defaultPluginCrudFormValues(schema))
                  }}
                >
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!showList && !showEditor ? (
        <Card>
          <CardHeader>
            <CardTitle>{schema.title ?? subpath}</CardTitle>
            <CardDescription>
              {schema.description || t('plugin.runtime.crudPageDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JsonEditor value={schema} readOnly height="280px" />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
