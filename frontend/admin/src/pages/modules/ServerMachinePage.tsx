import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { IconDots } from '@tabler/icons-react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { buildQuery, fetchJsonList, fetchJsonObject, postJson } from '@/lib/api'
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
import { Switch } from '@/components/ui/switch'

type MachineRow = {
  id?: number
  name?: string
  notes?: string
  is_active?: boolean
  servers_count?: number
  load_status?: string
  created_at?: number
}

export default function ServerMachinePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [data, setData] = useState<MachineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MachineRow | null>(null)
  const [form, setForm] = useState({ name: '', notes: '', is_active: true })
  const [saving, setSaving] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [infoTitle, setInfoTitle] = useState('')
  const [infoText, setInfoText] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetchJsonList('/server/machine/fetch')
      .then((rows) => setData(rows as MachineRow[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', notes: '', is_active: true })
    setDialogOpen(true)
  }

  function openEdit(row: MachineRow) {
    setEditing(row)
    setForm({ name: row.name ?? '', notes: row.notes ?? '', is_active: Boolean(row.is_active) })
    setDialogOpen(true)
  }

  async function saveMachine() {
    setSaving(true)
    try {
      await postJson('/server/machine/save', { ...form, id: editing?.id })
      toast.success(t('common.success'))
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  function showInfo(title: string, text: string) {
    setInfoTitle(title)
    setInfoText(text)
    setInfoOpen(true)
  }

  async function viewToken(row: MachineRow) {
    try {
      const res = await fetchJsonObject<{ token?: string }>(
        `/server/machine/getToken${buildQuery({ id: row.id })}`,
      )
      showInfo(t('machine.actions.viewToken', { defaultValue: '查看 Token' }), res.token ?? '')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function viewInstallCommand(row: MachineRow) {
    try {
      const res = await fetchJsonObject<{ install_command?: string }>(
        `/server/machine/installCommand${buildQuery({ id: row.id })}`,
      )
      showInfo(
        t('machine.actions.installCommand', { defaultValue: '安装命令' }),
        res.install_command ?? '',
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function viewNodes(row: MachineRow) {
    try {
      const nodes = await fetchJsonList('/server/machine/nodes', { machine_id: row.id })
      const lines = nodes.map((n) => {
        const node = n as Record<string, unknown>
        return `#${node.id} ${node.name ?? ''} (${node.host ?? ''})`
      })
      showInfo(
        t('machine.actions.viewNodes', { defaultValue: '关联节点' }),
        lines.length ? lines.join('\n') : t('common.table.noData'),
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function viewHistory(row: MachineRow) {
    try {
      const history = await fetchJsonList('/server/machine/history', { machine_id: row.id, limit: 360 })
      const lines = history.slice(0, 20).map((h) => {
        const item = h as Record<string, unknown>
        return `${item.recorded_at ?? item.created_at ?? ''} CPU:${item.cpu ?? '-'}% MEM:${item.mem ?? '-'}%`
      })
      showInfo(
        t('machine.actions.loadHistory', { defaultValue: '负载历史' }),
        lines.length ? lines.join('\n') : t('common.table.noData'),
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function resetToken(row: MachineRow) {
    try {
      const res = await postJson<{ token?: string; install_command?: string }>('/server/machine/resetToken', {
        id: row.id,
      })
      if (res.token) {
        showInfo(t('machine.actions.resetToken', { defaultValue: '重置 Token' }), res.token)
      } else {
        toast.success(t('common.success'))
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function deleteRow(row: MachineRow) {
    if (!window.confirm(t('common.deleteConfirm', { defaultValue: '确认删除？' }))) return
    try {
      await postJson('/server/machine/drop', { id: row.id })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const columns = useMemo<ColumnDef<MachineRow, unknown>[]>(
    () => [
      { accessorKey: 'id', header: () => t('machine.columns.id') },
      { accessorKey: 'name', header: () => t('machine.columns.name') },
      {
        accessorKey: 'is_active',
        header: () => t('machine.columns.status'),
        cell: ({ row }) =>
          row.original.is_active ? t('machine.status.active') : t('machine.status.inactive'),
      },
      { accessorKey: 'servers_count', header: () => t('machine.columns.nodes', { defaultValue: '节点数' }) },
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
              <DropdownMenuItem onClick={() => viewToken(row.original)}>
                {t('machine.actions.viewToken', { defaultValue: '查看 Token' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => viewInstallCommand(row.original)}>
                {t('machine.actions.installCommand', { defaultValue: '安装命令' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => viewNodes(row.original)}>
                {t('machine.actions.viewNodes', { defaultValue: '关联节点' })}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate(`/server/manage?machine_id=${row.original.id}`)}
              >
                {t('machine.actions.manageNodes', { defaultValue: '管理节点' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => viewHistory(row.original)}>
                {t('machine.actions.loadHistory', { defaultValue: '负载历史' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => resetToken(row.original)}>
                {t('machine.actions.resetToken', { defaultValue: '重置 Token' })}
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
    return data.filter((r) => String(r.name ?? '').toLowerCase().includes(q))
  }, [data, search])

  return (
    <div>
      <div className="mb-2">
        <h2 className="m-0 text-2xl font-bold tracking-tight">{t('machine.title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('machine.description')}</p>
      </div>
      <div className="-mx-4 flex-1 overflow-auto px-4 py-1">
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('machine.form.add', { defaultValue: '添加机器' })}
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
              {editing ? t('machine.form.edit', { defaultValue: '编辑机器' }) : t('machine.form.add', { defaultValue: '添加机器' })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>{t('machine.columns.name')}</Label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('machine.form.notes', { defaultValue: '备注' })}</Label>
              <input className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label>{t('machine.columns.status')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel', { defaultValue: '取消' })}
            </Button>
            <Button onClick={saveMachine} disabled={saving}>
              {t('common.save', { defaultValue: '保存' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{infoTitle}</DialogTitle>
          </DialogHeader>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
            {infoText}
          </pre>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(infoText)
                toast.success(t('common.copied', { defaultValue: '已复制' }))
              }}
            >
              {t('common.copy', { defaultValue: '复制' })}
            </Button>
            <Button onClick={() => setInfoOpen(false)}>{t('common.close', { defaultValue: '关闭' })}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
