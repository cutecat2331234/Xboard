import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { IconDots } from '@tabler/icons-react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { fetchJsonList, postJson } from '@/lib/api'
import { inputCls, textareaCls } from '@/lib/form-styles'
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

type RouteRow = {
  id?: number
  remarks?: string
  action?: string
  action_value?: string
  match?: string[]
}

const ACTIONS = ['block', 'direct', 'dns', 'proxy'] as const

export default function ServerRoutePage() {
  const { t } = useTranslation()
  const [data, setData] = useState<RouteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<RouteRow | null>(null)
  const [form, setForm] = useState({ remarks: '', action: 'proxy', action_value: '', match: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchJsonList('/server/route/fetch')
      .then((rows) => setData(rows as RouteRow[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ remarks: '', action: 'proxy', action_value: '', match: '' })
    setDialogOpen(true)
  }

  function openEdit(row: RouteRow) {
    setEditing(row)
    setForm({
      remarks: row.remarks ?? '',
      action: row.action ?? 'proxy',
      action_value: row.action_value ?? '',
      match: Array.isArray(row.match) ? row.match.join('\n') : '',
    })
    setDialogOpen(true)
  }

  async function saveRoute() {
    setSaving(true)
    try {
      const match = form.match
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      await postJson('/server/route/save', {
        id: editing?.id,
        remarks: form.remarks,
        action: form.action,
        action_value: form.action_value || null,
        match,
      })
      toast.success(t('common.success'))
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteRow(row: RouteRow) {
    if (!window.confirm(t('common.deleteConfirm', { defaultValue: '确认删除？' }))) return
    try {
      await postJson('/server/route/drop', { id: row.id })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const columns = useMemo<ColumnDef<RouteRow, unknown>[]>(
    () => [
      { accessorKey: 'id', header: () => t('route.columns.id') },
      { accessorKey: 'remarks', header: () => t('route.columns.remarks') },
      { accessorKey: 'action', header: () => t('route.columns.action') },
      { accessorKey: 'action_value', header: () => t('route.columns.action_value.title') },
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
    return data.filter((r) => String(r.remarks ?? '').toLowerCase().includes(q))
  }, [data, search])

  return (
    <div>
      <div className="mb-2">
        <h2 className="m-0 text-2xl font-bold tracking-tight">{t('route.title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('route.description')}</p>
      </div>
      <div className="-mx-4 flex-1 overflow-auto px-4 py-1">
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('route.form.add', { defaultValue: '添加路由' })}
            </Button>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className={`h-8 max-w-xs ${inputCls}`}
            />
          </div>
          <DataTable columns={columns} data={filtered} loading={loading} />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? t('route.form.edit', { defaultValue: '编辑路由' }) : t('route.form.add', { defaultValue: '添加路由' })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>{t('route.columns.remarks')}</Label>
              <input className={inputCls} value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('route.columns.action')}</Label>
              <select className={inputCls} value={form.action} onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('route.columns.action_value.title')}</Label>
              <input className={inputCls} value={form.action_value} onChange={(e) => setForm((f) => ({ ...f, action_value: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('route.form.match', { defaultValue: '匹配规则（每行一条）' })}</Label>
              <textarea className={textareaCls} value={form.match} onChange={(e) => setForm((f) => ({ ...f, match: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel', { defaultValue: '取消' })}
            </Button>
            <Button onClick={saveRoute} disabled={saving}>
              {t('common.save', { defaultValue: '保存' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
