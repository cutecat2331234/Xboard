import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { IconDots } from '@tabler/icons-react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { fetchJsonList, postJson } from '@/lib/api'
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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { TagInput } from '@/components/shared/TagInput'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

type NoticeRow = {
  id?: number
  title?: string
  content?: string
  img_url?: string
  tags?: string[] | string
  show?: number | boolean
  popup?: number | boolean
}

const inputCls =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

export default function NoticePage() {
  const { t } = useTranslation()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [data, setData] = useState<NoticeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<NoticeRow | null>(null)
  const [form, setForm] = useState<NoticeRow>({ show: 1 })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchJsonList('/notice/fetch')
      .then((rows) => setData(rows as NoticeRow[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ show: 1, popup: 0, title: '', content: '', img_url: '', tags: [] })
    setDialogOpen(true)
  }

  function openEdit(row: NoticeRow) {
    setEditing(row)
    setForm({
      ...row,
      tags: Array.isArray(row.tags)
        ? row.tags
        : typeof row.tags === 'string' && row.tags
          ? row.tags.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
    })
    setDialogOpen(true)
  }

  async function saveNotice() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        ...form,
        id: editing?.id,
        tags: Array.isArray(form.tags) ? form.tags : [],
      }
      await postJson('/notice/save', payload)
      toast.success(t('notice.form.buttons.success'))
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleShow(row: NoticeRow) {
    try {
      await postJson('/notice/show', { id: row.id })
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function deleteNotice(row: NoticeRow) {
    if (
      !(await confirm(
        t('notice.table.actions.delete.title'),
        t('notice.table.actions.delete.description'),
      ))
    )
      return
    try {
      await postJson('/notice/drop', { id: row.id })
      toast.success(t('notice.table.actions.delete.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((row) => String(row.title ?? '').toLowerCase().includes(q))
  }, [data, search])

  const sort = useIdListSort(filtered, '/notice/sort')

  async function handleSaveSort() {
    const ok = await sort.saveSort()
    if (ok) load()
  }

  const columns = useMemo<ColumnDef<NoticeRow, unknown>[]>(
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
            } as ColumnDef<NoticeRow, unknown>,
          ]
        : []),
      { accessorKey: 'id', header: () => t('notice.table.columns.id') },
      {
        accessorKey: 'show',
        header: () => t('notice.table.columns.show'),
        cell: ({ row }) => (
          <Switch
            checked={Boolean(row.original.show)}
            onCheckedChange={() => toggleShow(row.original)}
          />
        ),
      },
      { accessorKey: 'title', header: () => t('notice.table.columns.title') },
      ...(!sort.sortMode
        ? [
            {
              id: 'actions',
              header: () => t('notice.table.columns.actions'),
              cell: ({ row }: { row: { original: NoticeRow } }) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <IconDots className="tabler-icon h-4 w-4" stroke={2} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(row.original)}>
                      {t('notice.table.actions.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteNotice(row.original)}>
                      {t('notice.table.actions.delete.title')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            } as ColumnDef<NoticeRow, unknown>,
          ]
        : []),
    ],
    [t, sort],
  )

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="m-0 text-2xl font-bold tracking-tight">{t('notice.title')}</h2>
          <p className="mt-2 text-muted-foreground">{t('notice.description')}</p>
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
                  <span>{t('notice.form.add.button')}</span>
                </Button>
              ) : null}
              <SortToolbar
                sortMode={sort.sortMode}
                saving={sort.sortSaving}
                editLabel={t('notice.table.toolbar.sort.edit')}
                saveLabel={t('notice.table.toolbar.sort.save')}
                onEdit={sort.enterSort}
                onSave={handleSaveSort}
                onCancel={sort.cancelSort}
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('notice.table.toolbar.search')}
                className={`h-8 min-w-[150px] flex-1 sm:w-[150px] lg:w-[250px] ${inputCls}`}
                disabled={sort.sortMode}
              />
            </div>
          </div>
          <DataTable columns={columns} data={sort.displayRows} loading={loading} />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? t('notice.form.edit.title') : t('notice.form.add.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="xb-stack-4 py-2">
            <div className="xb-stack-2">
              <Label>{t('notice.form.fields.title.label')}</Label>
              <input
                className={inputCls}
                value={form.title ?? ''}
                placeholder={t('notice.form.fields.title.placeholder')}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="xb-stack-2">
              <Label>{t('notice.form.fields.content.label')}</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.content ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="xb-stack-2">
              <Label>{t('notice.form.fields.img_url.label')}</Label>
              <input
                className={inputCls}
                value={form.img_url ?? ''}
                placeholder={t('notice.form.fields.img_url.placeholder')}
                onChange={(e) => setForm((f) => ({ ...f, img_url: e.target.value }))}
              />
            </div>
            <div className="xb-stack-2">
              <Label>{t('notice.form.fields.tags.label')}</Label>
              <TagInput
                value={Array.isArray(form.tags) ? form.tags : []}
                onChange={(tags) => setForm((f) => ({ ...f, tags }))}
                placeholder={t('notice.form.fields.tags.placeholder')}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(form.show)}
                onCheckedChange={(v) => setForm((f) => ({ ...f, show: v ? 1 : 0 }))}
              />
              <Label>{t('notice.form.fields.show.label')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(form.popup)}
                onCheckedChange={(v) => setForm((f) => ({ ...f, popup: v ? 1 : 0 }))}
              />
              <Label>{t('notice.form.fields.popup.label')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('notice.form.buttons.cancel')}
            </Button>
            <Button onClick={saveNotice} disabled={saving}>
              {t('notice.form.buttons.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  )
}
