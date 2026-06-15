import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { IconDots } from '@tabler/icons-react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/api-errors'
import { adminApi, buildQuery, fetchJsonList, fetchPaginatedList, postJson } from '@/lib/api'
import { inputCls, textareaCls } from '@/lib/form-styles'
import { useIdListSort } from '@/lib/use-id-list-sort'
import { DataTable } from '@/components/shared/DataTable'
import { SortRowControls, SortToolbar } from '@/components/shared/SortToolbar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

type KnowledgeRow = {
  id?: number
  title?: string
  category?: string
  language?: string
  body?: string
  show?: boolean | number
}

const LANGUAGES = ['zh-CN', 'en-US', 'ja-JP', 'vi-VN', 'ko-KR', 'zh-TW', 'ru-RU', 'fa-IR'] as const

export default function KnowledgePage() {
  const { t } = useTranslation()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [data, setData] = useState<KnowledgeRow[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<KnowledgeRow | null>(null)
  const [form, setForm] = useState<KnowledgeRow>({ show: true, language: 'zh-CN' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetchPaginatedList<KnowledgeRow>('/knowledge/fetch', {
        current: page,
        pageSize,
        title: search.trim() || undefined,
      }),
      fetchJsonList('/knowledge/getCategory'),
    ])
      .then(([pageRes, cats]) => {
        setData(pageRes.data)
        setTotal(pageRes.total ?? pageRes.data.length)
        setCategories(cats as string[])
      })
      .catch((e) => toastApiError(e, toast, t, t('common.error')))
      .finally(() => setLoading(false))
  }, [page, pageSize, search, t])

  const loadAll = useCallback(() => {
    return fetchJsonList('/knowledge/fetch').then((rows) => rows as KnowledgeRow[])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ show: true, language: 'zh-CN', title: '', category: '', body: '' })
    setDialogOpen(true)
  }

  async function openEdit(row: KnowledgeRow) {
    try {
      const result = await adminApi<{ status?: string; data?: KnowledgeRow }>(
        `/knowledge/fetch${buildQuery({ id: row.id })}`,
      )
      const detail = result.data ?? row
      setEditing(row)
      setForm({ ...detail, show: detail.show ?? true })
      setDialogOpen(true)
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    }
  }

  async function saveKnowledge() {
    setSaving(true)
    try {
      await postJson('/knowledge/save', { ...form, id: editing?.id })
      toast.success(t('common.success'))
      setDialogOpen(false)
      load()
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleShow(row: KnowledgeRow) {
    try {
      await postJson('/knowledge/show', { id: row.id })
      load()
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    }
  }

  async function deleteRow(row: KnowledgeRow) {
    if (
      !(await confirm(
        t('knowledge.messages.deleteConfirm'),
        t('knowledge.messages.deleteDescription'),
        { confirmLabel: t('knowledge.messages.deleteButton') },
      ))
    )
      return
    try {
      await postJson('/knowledge/drop', { id: row.id })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    }
  }

  const filtered = useMemo(() => data, [data])

  const sort = useIdListSort(filtered, '/knowledge/sort')

  async function enterSortMode() {
    setLoading(true)
    try {
      const rows = await loadAll()
      setData(rows)
      sort.enterSort(rows)
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSort() {
    const ok = await sort.saveSort()
    if (ok) load()
  }

  function handleCancelSort() {
    sort.cancelSort()
    load()
  }

  const columns = useMemo<ColumnDef<KnowledgeRow, unknown>[]>(
    () => [
      ...(sort.sortMode
        ? [
            {
              id: 'sort',
              header: () => t('server.columns.sort'),
              cell: ({ row }: { row: { index: number } }) => (
                <SortRowControls
                  index={row.index}
                  total={sort.sortRows.length}
                  draggable
                  onMoveUp={() => sort.moveUp(row.index)}
                  onMoveDown={() => sort.moveDown(row.index)}
                  onDragStart={() => sort.setDragIndex(row.index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => sort.handleDrop(row.index)}
                />
              ),
            } as ColumnDef<KnowledgeRow, unknown>,
          ]
        : []),
      { accessorKey: 'id', header: () => t('knowledge.columns.id') },
      { accessorKey: 'title', header: () => t('knowledge.columns.title') },
      { accessorKey: 'category', header: () => t('knowledge.columns.category') },
      {
        accessorKey: 'show',
        header: () => t('knowledge.columns.show'),
        cell: ({ row }) => (
          <Switch
            checked={Boolean(row.original.show)}
            onCheckedChange={() => toggleShow(row.original)}
          />
        ),
      },
      ...(!sort.sortMode
        ? [
            {
              id: 'actions',
              header: () => t('common.table.columns.actions'),
              cell: ({ row }: { row: { original: KnowledgeRow } }) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <IconDots className="tabler-icon h-4 w-4" stroke={2} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(row.original)}>
                      {t('common.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteRow(row.original)}>
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            } as ColumnDef<KnowledgeRow, unknown>,
          ]
        : []),
    ],
    [t, sort],
  )

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="m-0 text-2xl font-bold tracking-tight">{t('knowledge.title')}</h2>
          <p className="mt-2 text-muted-foreground">{t('knowledge.description')}</p>
        </div>
      </div>

      <div className="-mx-4 flex-1 overflow-auto px-4 py-1">
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {!sort.sortMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-0 space-x-2 px-3 text-xs"
                  onClick={openCreate}
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('knowledge.form.add')}</span>
                </Button>
              ) : null}
              <SortToolbar
                sortMode={sort.sortMode}
                saving={sort.sortSaving}
                editLabel={t('knowledge.toolbar.editSort')}
                saveLabel={t('knowledge.toolbar.saveSort')}
                hint={sort.sortMode ? t('knowledge.toolbar.sortModeHint') : undefined}
                onEdit={enterSortMode}
                onSave={handleSaveSort}
                onCancel={handleCancelSort}
              />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1)
                    load()
                  }
                }}
                placeholder={t('common.search')}
                className={`h-8 min-w-[150px] flex-1 sm:w-[150px] lg:w-[250px] ${inputCls}`}
                disabled={sort.sortMode}
              />
            </div>
          </div>
          <DataTable
            columns={columns}
            data={sort.displayRows}
            loading={loading}
            pageSize={pageSize}
            alwaysShowPagination={!sort.sortMode}
            totalItems={total}
            pageIndex={page - 1}
            pageCount={Math.max(1, Math.ceil(total / pageSize))}
            onPageIndexChange={(idx) => setPage(idx + 1)}
          />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('knowledge.form.edit') : t('knowledge.form.add')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>{t('knowledge.form.title')}</Label>
              <input
                className={inputCls}
                value={form.title ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('knowledge.form.category')}</Label>
              <input
                className={inputCls}
                list="knowledge-categories"
                value={form.category ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
              <datalist id="knowledge-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('knowledge.form.language')}</Label>
              <select
                className={inputCls}
                value={form.language ?? 'zh-CN'}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {t(`knowledge.languages.${lang}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('knowledge.form.content')}</Label>
              <textarea
                className={textareaCls}
                value={form.body ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(form.show)}
                onCheckedChange={(v) => setForm((f) => ({ ...f, show: v }))}
              />
              <Label>{t('knowledge.form.show')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveKnowledge} disabled={saving}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  )
}
