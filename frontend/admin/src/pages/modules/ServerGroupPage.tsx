import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { IconDots } from '@tabler/icons-react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { fetchJsonList, postJson } from '@/lib/api'
import { inputCls } from '@/lib/form-styles'
import { DataTable } from '@/components/shared/DataTable'
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

type GroupRow = { id?: number; name?: string; users_count?: number; server_count?: number }

export default function ServerGroupPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<GroupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<GroupRow | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchJsonList('/server/group/fetch')
      .then((rows) => setData(rows as GroupRow[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setName('')
    setDialogOpen(true)
  }

  function openEdit(row: GroupRow) {
    setEditing(row)
    setName(row.name ?? '')
    setDialogOpen(true)
  }

  async function saveGroup() {
    setSaving(true)
    try {
      await postJson('/server/group/save', { id: editing?.id, name })
      toast.success(t('common.success'))
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteRow(row: GroupRow) {
    if (!window.confirm(t('common.deleteConfirm', { defaultValue: '确认删除？' }))) return
    try {
      await postJson('/server/group/drop', { id: row.id })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const columns = useMemo<ColumnDef<GroupRow, unknown>[]>(
    () => [
      { accessorKey: 'id', header: () => t('group.columns.id') },
      { accessorKey: 'name', header: () => t('group.columns.name') },
      {
        id: 'actions',
        header: () => t('common.table.columns.actions', { defaultValue: '操作' }),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <IconDots className="tabler-icon h-4 w-4" stroke={2} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                {t('common.edit', { defaultValue: '编辑' })}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => deleteRow(row.original)}>
                {t('common.delete', { defaultValue: '删除' })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t],
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((row) => String(row.name ?? '').toLowerCase().includes(q))
  }, [data, search])

  return (
    <div>
      <div className="mb-2">
        <h2 className="m-0 text-2xl font-bold tracking-tight">{t('group.title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('group.description')}</p>
      </div>

      <div className="-mx-4 flex-1 overflow-auto px-4 py-1">
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-0 space-x-2 px-3 text-xs"
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              <span>{t('group.form.add', { defaultValue: '添加权限组' })}</span>
            </Button>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className={`h-8 min-w-[150px] flex-1 sm:w-[150px] lg:w-[250px] ${inputCls}`}
            />
          </div>
          <DataTable columns={columns} data={filtered} loading={loading} />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t('group.form.edit', { defaultValue: '编辑权限组' })
                : t('group.form.add', { defaultValue: '添加权限组' })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label>{t('group.columns.name')}</Label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel', { defaultValue: '取消' })}
            </Button>
            <Button onClick={saveGroup} disabled={saving}>
              {t('common.save', { defaultValue: '保存' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
