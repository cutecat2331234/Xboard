import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { IconDots } from '@tabler/icons-react'
import { Copy, Plus } from 'lucide-react'
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
  DialogDescription,
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

type NodeItem = {
  id?: number
  name?: string
  type?: string
  host?: string
  port?: number | string
  show?: boolean
  enabled?: boolean
}

type HistoryItem = {
  cpu?: number
  mem_total?: number
  mem_used?: number
  disk_total?: number
  disk_used?: number
  net_in_speed?: number
  net_out_speed?: number
  recorded_at?: number
}

type InfoKind = 'token' | 'install' | 'nodes' | 'history'

function formatTs(ts?: number | null) {
  if (!ts) return '—'
  const d = new Date(ts * 1000)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function pct(used?: number, total?: number) {
  if (!total || total <= 0 || used == null) return '—'
  return `${((used / total) * 100).toFixed(1)}%`
}

function formatNodeLine(node: NodeItem) {
  return `#${node.id} ${node.name ?? ''} (${node.host ?? ''}:${node.port ?? ''})`
}

function formatHistoryLine(item: HistoryItem, t: (key: string) => string) {
  const cpu = item.cpu != null ? `${item.cpu}%` : '—'
  const mem = pct(item.mem_used, item.mem_total)
  const disk = pct(item.disk_used, item.disk_total)
  return `${formatTs(item.recorded_at)} ${t('machine.columns.cpu')}:${cpu} ${t('machine.columns.memory')}:${mem} ${t('machine.columns.disk')}:${disk}`
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
  const [infoKind, setInfoKind] = useState<InfoKind>('token')
  const [infoLoading, setInfoLoading] = useState(false)
  const [infoToken, setInfoToken] = useState('')
  const [infoCommand, setInfoCommand] = useState('')
  const [infoNodes, setInfoNodes] = useState<NodeItem[]>([])
  const [infoHistory, setInfoHistory] = useState<HistoryItem[]>([])

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

  async function copyText(text: string, copiedKey: string, failedKey: string) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t(copiedKey))
    } catch {
      toast.error(t(failedKey))
    }
  }

  async function openInfoDialog(kind: InfoKind, row: MachineRow, preset?: { token?: string }) {
    setInfoKind(kind)
    setInfoOpen(true)
    setInfoLoading(!preset)
    setInfoToken(preset?.token ?? '')
    setInfoCommand('')
    setInfoNodes([])
    setInfoHistory([])

    if (preset?.token) return

    setInfoLoading(true)
    try {
      if (kind === 'token') {
        const res = await fetchJsonObject<{ token?: string }>(
          `/server/machine/getToken${buildQuery({ id: row.id })}`,
        )
        setInfoToken(res.token ?? '')
      } else if (kind === 'install') {
        const res = await fetchJsonObject<{ command?: string }>(
          `/server/machine/installCommand${buildQuery({ id: row.id })}`,
        )
        setInfoCommand(res.command ?? '')
      } else if (kind === 'nodes') {
        const nodes = await fetchJsonList('/server/machine/nodes', { machine_id: row.id })
        setInfoNodes(nodes as NodeItem[])
      } else if (kind === 'history') {
        const history = await fetchJsonList('/server/machine/history', {
          machine_id: row.id,
          limit: 360,
        })
        setInfoHistory((history as HistoryItem[]).slice(0, 20))
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
      setInfoOpen(false)
    } finally {
      setInfoLoading(false)
    }
  }

  async function resetToken(row: MachineRow) {
    try {
      const res = await postJson<{ token?: string }>('/server/machine/resetToken', { id: row.id })
      if (res.token) {
        toast.success(t('machine.token.resetSuccess'))
        await openInfoDialog('token', row, { token: res.token })
      } else {
        toast.success(t('common.success'))
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function deleteRow(row: MachineRow) {
    if (!window.confirm(t('machine.messages.deleteConfirm'))) return
    try {
      await postJson('/server/machine/drop', { id: row.id })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const infoCopyText = useMemo(() => {
    if (infoKind === 'token') return infoToken
    if (infoKind === 'install') return infoCommand
    if (infoKind === 'nodes') {
      return infoNodes.length ? infoNodes.map(formatNodeLine).join('\n') : ''
    }
    if (infoKind === 'history') {
      return infoHistory.length ? infoHistory.map((item) => formatHistoryLine(item, t)).join('\n') : ''
    }
    return ''
  }, [infoKind, infoToken, infoCommand, infoNodes, infoHistory, t])

  const infoCopyCopiedKey =
    infoKind === 'token'
      ? 'machine.token.copied'
      : infoKind === 'install'
        ? 'machine.install.copied'
        : 'common.copy.success'

  const infoCopyFailedKey =
    infoKind === 'token'
      ? 'machine.token.copyFailed'
      : infoKind === 'install'
        ? 'machine.install.copyFailed'
        : 'common.copy.failed'

  const infoCopyLabel =
    infoKind === 'token'
      ? t('machine.token.copy')
      : infoKind === 'install'
        ? t('machine.install.copy')
        : t('common.copy.success')

  const columns = useMemo<ColumnDef<MachineRow, unknown>[]>(
    () => [
      { accessorKey: 'id', header: () => t('machine.columns.id') },
      { accessorKey: 'name', header: () => t('machine.columns.name') },
      {
        accessorKey: 'is_active',
        header: () => t('machine.columns.status'),
        cell: ({ row }) =>
          row.original.is_active ? t('machine.columns.online') : t('machine.columns.inactive'),
      },
      { accessorKey: 'servers_count', header: () => t('machine.columns.nodes') },
      {
        id: 'actions',
        header: () => t('machine.columns.actions'),
        cell: ({ row }) => (
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
              <DropdownMenuItem onClick={() => openInfoDialog('token', row.original)}>
                {t('machine.actions.viewToken')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openInfoDialog('install', row.original)}>
                {t('machine.actions.installCommand')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openInfoDialog('nodes', row.original)}>
                {t('machine.actions.viewNodes')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate(`/server/manage?machine_id=${row.original.id}`)}
              >
                {t('machine.actions.manageNodes')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openInfoDialog('history', row.original)}>
                {t('machine.actions.loadHistory')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => resetToken(row.original)}>
                {t('machine.actions.resetToken')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => deleteRow(row.original)}>
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, navigate],
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
              {t('machine.form.add')}
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
              {editing ? t('machine.form.edit') : t('machine.form.add')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>{t('machine.columns.name')}</Label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('machine.form.notes')}</Label>
              <input className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label>{t('machine.columns.status')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveMachine} disabled={saving}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className={infoKind === 'nodes' || infoKind === 'history' ? 'max-w-2xl' : 'max-w-lg'}>
          <DialogHeader>
            <DialogTitle>
              {infoKind === 'token' && t('machine.token.title')}
              {infoKind === 'install' && t('machine.install.title')}
              {infoKind === 'nodes' && t('machine.detail.associatedNodes')}
              {infoKind === 'history' && t('machine.detail.loadTrend')}
            </DialogTitle>
            {infoKind === 'token' && (
              <DialogDescription>{t('machine.token.description')}</DialogDescription>
            )}
            {infoKind === 'install' && (
              <DialogDescription>{t('machine.install.description')}</DialogDescription>
            )}
          </DialogHeader>

          {infoLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <>
              {infoKind === 'token' && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <code className="block break-all font-mono text-xs">{infoToken || t('machine.columns.noData')}</code>
                </div>
              )}

              {infoKind === 'install' && (
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <code className="block whitespace-pre-wrap break-all font-mono text-xs">
                      {infoCommand || t('machine.columns.noData')}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('machine.install.hint')}</p>
                </div>
              )}

              {infoKind === 'nodes' && (
                infoNodes.length ? (
                  <div className="max-h-80 overflow-auto rounded-lg border">
                    <table className="w-full min-w-[480px] text-xs">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="px-3 py-2 text-left font-medium">{t('machine.detail.nodeName')}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('machine.detail.nodeType')}</th>
                          <th className="px-3 py-2 text-left font-medium">{t('machine.detail.nodeHost')}</th>
                          <th className="px-3 py-2 text-center font-medium">{t('machine.detail.nodeEnabled')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {infoNodes.map((node) => (
                          <tr key={node.id} className="border-b last:border-0">
                            <td className="px-3 py-2 font-mono">
                              <span className="text-muted-foreground">#{node.id}</span> {node.name}
                            </td>
                            <td className="px-3 py-2 font-mono text-muted-foreground">{node.type}</td>
                            <td className="px-3 py-2 font-mono text-muted-foreground">
                              {node.host}:{node.port}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {node.enabled ? t('machine.columns.online') : t('machine.columns.inactive')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">{t('machine.detail.noNodes')}</p>
                )
              )}

              {infoKind === 'history' && (
                infoHistory.length ? (
                  <div className="max-h-80 overflow-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="px-3 py-2 text-left font-medium">{t('machine.columns.lastReport')}</th>
                          <th className="px-3 py-2 text-right font-medium">{t('machine.columns.cpu')}</th>
                          <th className="px-3 py-2 text-right font-medium">{t('machine.columns.memory')}</th>
                          <th className="px-3 py-2 text-right font-medium">{t('machine.columns.disk')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {infoHistory.map((item, index) => (
                          <tr key={`${item.recorded_at ?? index}`} className="border-b last:border-0">
                            <td className="px-3 py-2 font-mono text-muted-foreground">
                              {formatTs(item.recorded_at)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {item.cpu != null ? `${item.cpu}%` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {pct(item.mem_used, item.mem_total)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {pct(item.disk_used, item.disk_total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">{t('machine.detail.noHistory')}</p>
                )
              )}
            </>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={infoLoading || !infoCopyText}
              onClick={() => copyText(infoCopyText, infoCopyCopiedKey, infoCopyFailedKey)}
            >
              <Copy className="mr-2 h-4 w-4" />
              {infoCopyLabel}
            </Button>
            <Button onClick={() => setInfoOpen(false)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
