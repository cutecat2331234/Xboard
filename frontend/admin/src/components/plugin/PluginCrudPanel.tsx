import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { JsonEditor, type JsonEditorHandle } from '@/components/JsonEditor'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { inputCls } from '@/lib/form-styles'
import {
  buildPluginCrudColumns,
  defaultPluginCrudFormValues,
  deletePluginCrudRecord,
  fetchPluginCrudList,
  hasPluginCrudTypedForm,
  normalizePluginCrudFormFields,
  PluginCrudFormFields,
  resolvePluginCrudApiPath,
  savePluginCrudRecord,
} from '@/lib/plugin-crud'
import type { PluginAdminCrudSchema, PluginRow } from '@/lib/plugin-types'
import { toast } from 'sonner'

import { toastApiError } from '@/lib/api-errors'
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

  const formFields = useMemo(() => normalizePluginCrudFormFields(schema.form), [schema.form])
  const hasTypedForm = hasPluginCrudTypedForm(schema)
  const isCreate = editing && (draft[idField] == null || draft[idField] === '')

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
      toastApiError(e, toast, t, t('common.error'))
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [listPath, page, pageSize, search, t])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const resetDraft = useCallback(() => {
    setDraft(defaultPluginCrudFormValues(schema))
  }, [schema])

  const closeEditor = useCallback(() => {
    setEditing(false)
    resetDraft()
  }, [resetDraft])

  const beginCreate = useCallback(() => {
    resetDraft()
    setEditing(true)
  }, [resetDraft])

  const beginEdit = useCallback((row: Record<string, unknown>) => {
    setDraft({ ...defaultPluginCrudFormValues(schema), ...row })
    setEditing(true)
  }, [schema])

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
        toastApiError(e, toast, t, t('common.error'))
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

    if (hasTypedForm) {
      const missing = formFields.filter(
        (item) => item.field.required && !item.field.hidden && (draft[item.key] == null || draft[item.key] === ''),
      )
      if (missing.length > 0) {
        const labels = missing.map((item) => item.field.label ?? item.key).join(', ')
        toast.error(t('plugin.runtime.requiredFields', { fields: labels, defaultValue: `Required: ${labels}` }))
        return
      }
    }

    setSaving(true)
    try {
      const payload = hasTypedForm
        ? draft
        : (JSON.parse(editorRef.current?.getValue() ?? JSON.stringify(draft, null, 2)) as Record<string, unknown>)
      await savePluginCrudRecord(savePath, payload)
      toast.success(t('common.success'))
      closeEditor()
      await loadRows()
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  const showList = Boolean(listPath)
  const showStandaloneEditor = Boolean(savePath && !showList)
  const editorTitle = isCreate ? t('plugin.runtime.create') : t('plugin.runtime.edit')

  function renderEditorBody() {
    if (hasTypedForm) {
      return (
        <PluginCrudFormFields
          fields={formFields}
          values={draft}
          idField={idField}
          onChange={(key, value) => setDraft((prev) => ({ ...prev, [key]: value }))}
        />
      )
    }

    return (
      <JsonEditor
        key={editing ? `edit:${String(draft[idField] ?? 'new')}` : 'schema'}
        ref={editorRef}
        value={draft}
        readOnly={false}
        height="320px"
      />
    )
  }

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
                  placeholder={t('plugin.runtime.searchPlaceholder')}
                  className={`h-8 max-w-sm ${inputCls}`}
                />
              ) : (
                <div />
              )}
              {schema.actions?.create && savePath ? (
                <Button size="sm" onClick={beginCreate}>
                  <Plus className="mr-1 h-4 w-4" />
                  {t('plugin.runtime.create')}
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

      {showList && savePath ? (
        <Dialog
          open={editing}
          onOpenChange={(open) => {
            if (!open) closeEditor()
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editorTitle}</DialogTitle>
              {schema.description ? (
                <DialogDescription>{schema.description}</DialogDescription>
              ) : null}
            </DialogHeader>
            {renderEditorBody()}
            <DialogFooter>
              <Button variant="outline" onClick={closeEditor} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {showStandaloneEditor ? (
        <Card>
          <CardHeader>
            <CardTitle>{schema.title ?? t('plugin.runtime.schemaEditor')}</CardTitle>
            <CardDescription>
              {schema.description ? (
                schema.description
              ) : savePath ? (
                <code className="text-xs">{savePath}</code>
              ) : (
                t('plugin.runtime.crudPageDescription')
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderEditorBody()}
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {t('common.save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!showList && !showStandaloneEditor ? (
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
