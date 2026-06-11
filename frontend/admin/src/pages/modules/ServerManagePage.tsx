import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ColumnDef } from '@tanstack/react-table'

import { IconDots } from '@tabler/icons-react'
import { Loader2, Plus, Sparkles, Users, X } from 'lucide-react'

import { Link, useSearchParams } from 'react-router-dom'

import { useTranslation } from 'react-i18next'

import { toast } from 'sonner'

import { fetchJsonList, generateEchKey, postJson } from '@/lib/api'

import { inputCls, textareaCls } from '@/lib/form-styles'

import { moveListItem, reorderList } from '@/lib/list-sort'

import { DataTable } from '@/components/shared/DataTable'
import { FormSelect } from '@/components/shared/FormSelect'
import { SuffixInput } from '@/components/shared/SuffixInput'
import { TagInput } from '@/components/shared/TagInput'

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

  DropdownMenuSeparator,

  DropdownMenuTrigger,

} from '@/components/ui/dropdown-menu'

import { Input } from '@/components/ui/input'

import { Label } from '@/components/ui/label'

import { Switch } from '@/components/ui/switch'

import { useConfirmDialog } from '@/hooks/useConfirmDialog'



type GroupRow = { id?: number; name?: string }

type MachineRow = { id?: number; name?: string }
type RouteRow = { id?: number; name?: string }

type NodeRow = Record<string, unknown> & {

  id?: number

  name?: string

  type?: string

  host?: string

  port?: string | number

  server_port?: number

  show?: number | boolean

  enabled?: number | boolean

  rate?: number

  online?: number

  group_ids?: number[]

  sort?: number

  machine_id?: number | null

  protocol_settings?: Record<string, unknown>

}



const NODE_TYPES = ['shadowsocks', 'vmess', 'trojan', 'vless', 'hysteria', 'tuic'] as const

const TLS_NODE_TYPES = new Set(['vmess', 'vless', 'trojan'])

function readEchSettings(protocolSettings?: Record<string, unknown>) {
  const tls = (protocolSettings?.tls ?? protocolSettings?.tls_settings) as
    | Record<string, unknown>
    | undefined
  const ech = (tls?.ech ?? {}) as Record<string, string>
  return {
    key: ech.key ?? '',
    config: ech.config ?? '',
    query_server_name: ech.query_server_name ?? '',
  }
}

function mergeEchSettings(
  protocolSettings: Record<string, unknown> | undefined,
  ech: { key: string; config: string; query_server_name: string },
) {
  const base = { ...(protocolSettings ?? {}) }
  const tlsKey = base.tls != null ? 'tls' : 'tls_settings'
  const tls = { ...((base[tlsKey] as Record<string, unknown>) ?? {}) }
  tls.ech = {
    ...((tls.ech as Record<string, unknown>) ?? {}),
    key: ech.key || undefined,
    config: ech.config || undefined,
    query_server_name: ech.query_server_name || undefined,
  }
  base[tlsKey] = tls
  return base
}



type ServerForm = {
  type: string
  name: string
  host: string
  port: string
  server_port: string
  rate: string
  group_ids: number[]
  traffic_limit: string
  code: string
  tags: string[]
  parent_id: string
  route_id: string
  machine_id: string
  rate_time_enable: boolean
}

function defaultCreatePayload(form: ServerForm) {

  const type = form.type || 'shadowsocks'

  const trafficGb = form.traffic_limit.trim() === '' ? 0 : Number(form.traffic_limit)

  const base: Record<string, unknown> = {

    type,

    name: form.name,

    host: form.host,

    port: form.port,

    server_port: Number(form.server_port),

    rate: Number(form.rate) || 1,

    show: 1,

    group_ids: form.group_ids,

    code: form.code || undefined,

    tags: form.tags.length ? form.tags : undefined,

    parent_id: form.parent_id ? Number(form.parent_id) : null,

    route_ids: form.route_id ? [Number(form.route_id)] : [],

    machine_id: form.machine_id ? Number(form.machine_id) : null,

    rate_time_enable: form.rate_time_enable,

    transfer_enable: trafficGb > 0 ? Math.round(trafficGb * 1073741824) : 0,

  }

  if (type === 'shadowsocks') {

    base.protocol_settings = { cipher: 'aes-256-gcm' }

  } else if (type === 'vmess' || type === 'vless') {

    base.protocol_settings = { tls: 0, network: 'tcp' }

  } else if (type === 'trojan') {

    base.protocol_settings = { network: 'tcp' }

  }

  return base

}



export default function ServerManagePage() {

  const { t } = useTranslation()

  const { confirm, ConfirmDialog } = useConfirmDialog()

  const [searchParams, setSearchParams] = useSearchParams()

  const [data, setData] = useState<NodeRow[]>([])

  const [groups, setGroups] = useState<GroupRow[]>([])

  const [machines, setMachines] = useState<MachineRow[]>([])

  const [routes, setRoutes] = useState<RouteRow[]>([])

  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)

  const [editing, setEditing] = useState<NodeRow | null>(null)

  const emptyForm = (): ServerForm => ({
    name: '',
    type: '',
    host: '',
    port: '443',
    server_port: '443',
    rate: '1',
    group_ids: [],
    traffic_limit: '',
    code: '',
    tags: [],
    parent_id: '',
    route_id: '',
    machine_id: '',
    rate_time_enable: false,
  })

  const [form, setForm] = useState<ServerForm>(emptyForm())

  const [saving, setSaving] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const [sortMode, setSortMode] = useState(false)

  const [sortRows, setSortRows] = useState<NodeRow[]>([])

  const [sortSaving, setSortSaving] = useState(false)

  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const [echForm, setEchForm] = useState({ key: '', config: '', query_server_name: '' })

  const [echGenerating, setEchGenerating] = useState(false)

  const machineIdFilter = searchParams.get('machine_id')

  const activeMachine = useMemo(
    () => machines.find((m) => String(m.id) === machineIdFilter) ?? null,
    [machines, machineIdFilter],
  )



  const load = useCallback(() => {

    setLoading(true)

    Promise.all([
      fetchJsonList('/server/manage/getNodes'),
      fetchJsonList('/server/group/fetch'),
      fetchJsonList('/server/machine/fetch'),
      fetchJsonList('/server/route/fetch'),
    ])

      .then(([rows, grps, mchs, rts]) => {

        setData(rows as NodeRow[])

        setGroups(grps as GroupRow[])

        setMachines(mchs as MachineRow[])

        setRoutes(rts as RouteRow[])

      })

      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))

      .finally(() => setLoading(false))

  }, [t])



  useEffect(() => {

    load()

  }, [load])



  function openCreate() {

    setEditing(null)

    setForm({
      ...emptyForm(),
      machine_id: machineIdFilter ?? '',
    })

    setEchForm({ key: '', config: '', query_server_name: '' })

    setDialogOpen(true)

  }



  function openEdit(row: NodeRow) {

    setEditing(row)

    const transferRaw = Number(row.transfer_enable ?? 0)
    const transferGb = transferRaw > 0 ? String(Math.round(transferRaw / 1073741824)) : ''
    const routeIds = Array.isArray(row.route_ids) ? row.route_ids.map(Number) : []

    setForm({

      name: String(row.name ?? ''),

      type: String(row.type ?? 'shadowsocks'),

      host: String(row.host ?? ''),

      port: String(row.port ?? ''),

      server_port: String(row.server_port ?? ''),

      rate: String(row.rate ?? 1),

      group_ids: Array.isArray(row.group_ids) ? row.group_ids.map(Number) : [],

      traffic_limit: transferGb,

      code: String(row.code ?? ''),

      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],

      parent_id: row.parent_id != null ? String(row.parent_id) : '',

      route_id: routeIds[0] != null ? String(routeIds[0]) : '',

      machine_id: row.machine_id != null ? String(row.machine_id) : '',

      rate_time_enable: Boolean(row.rate_time_enable),

    })

    setEchForm(readEchSettings(row.protocol_settings))

    setDialogOpen(true)

  }



  async function saveNode() {

    if (!form.type) {

      toast.error(t('server.form.type.select_error'))

      return

    }

    setSaving(true)

    try {

      const baseProtocol =
        editing?.protocol_settings ?? (defaultCreatePayload(form).protocol_settings as Record<string, unknown>)

      const protocol_settings =
        TLS_NODE_TYPES.has(form.type) && (echForm.key || echForm.config || echForm.query_server_name)
          ? mergeEchSettings(baseProtocol, echForm)
          : baseProtocol

      const payload = editing

        ? {

            ...editing,

            ...defaultCreatePayload(form),

            id: editing.id,

            protocol_settings,

          }

        : { ...defaultCreatePayload(form), protocol_settings }

      await postJson('/server/manage/save', payload)

      toast.success(t('common.success'))

      setDialogOpen(false)

      load()

    } catch (e) {

      toast.error(e instanceof Error ? e.message : t('common.error'))

    } finally {

      setSaving(false)

    }

  }



  async function toggleShow(row: NodeRow) {

    try {

      await postJson('/server/manage/update', { id: row.id, show: row.show ? 0 : 1 })

      load()

    } catch (e) {

      toast.error(e instanceof Error ? e.message : t('common.error'))

    }

  }



  async function copyNode(row: NodeRow) {

    try {

      await postJson('/server/manage/copy', { id: row.id })

      toast.success(t('common.success'))

      load()

    } catch (e) {

      toast.error(e instanceof Error ? e.message : t('common.error'))

    }

  }



  async function deleteNode(row: NodeRow) {

    if (!(await confirm(t('common.deleteConfirm', { defaultValue: '确认删除？' })))) return

    try {

      await postJson('/server/manage/drop', { id: row.id })

      toast.success(t('common.success'))

      load()

    } catch (e) {

      toast.error(e instanceof Error ? e.message : t('common.error'))

    }

  }



  async function resetNodeTraffic(row: NodeRow) {

    try {

      await postJson('/server/manage/resetTraffic', { id: row.id })

      toast.success(t('common.success'))

      load()

    } catch (e) {

      toast.error(e instanceof Error ? e.message : t('common.error'))

    }

  }



  function toggleGroupId(groupId: number) {
    setForm((f) => {
      const group_ids = f.group_ids.includes(groupId)
        ? f.group_ids.filter((id) => id !== groupId)
        : [...f.group_ids, groupId]
      return { ...f, group_ids }
    })
  }

  function toggleSelect(id: number) {

    setSelectedIds((prev) => {

      const next = new Set(prev)

      if (next.has(id)) next.delete(id)

      else next.add(id)

      return next

    })

  }



  function toggleSelectAll(rows: NodeRow[]) {

    const ids = rows.map((r) => Number(r.id)).filter(Boolean)

    setSelectedIds((prev) => (prev.size === ids.length ? new Set() : new Set(ids)))

  }



  async function batchDelete() {

    const ids = [...selectedIds]

    if (!ids.length) return

    if (

      !(await confirm(

        t('server.toolbar.batch_delete.description', {

          count: ids.length,

          defaultValue: `确定要删除选中的 ${ids.length} 个节点吗？`,

        }),

      ))

    ) {

      return

    }

    try {

      await postJson('/server/manage/batchDelete', { ids })

      toast.success(

        t('server.toolbar.batch_delete_success', {

          count: ids.length,

          defaultValue: `成功删除 ${ids.length} 个节点`,

        }),

      )

      setSelectedIds(new Set())

      load()

    } catch (e) {

      toast.error(e instanceof Error ? e.message : t('server.toolbar.batch_delete_error', { defaultValue: '批量删除失败' }))

    }

  }



  async function batchUpdateField(
    field: 'show' | 'enabled',
    value: number | boolean,
    successKey: string,
    errorKey: string,
  ) {
    const ids = [...selectedIds]
    if (!ids.length) return
    try {
      await postJson('/server/manage/batchUpdate', { ids, [field]: value })
      toast.success(t(successKey, { count: ids.length, defaultValue: `已更新 ${ids.length} 个节点` }))
      setSelectedIds(new Set())
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t(errorKey, { defaultValue: '批量更新失败' }))
    }
  }

  async function generateEchPair() {
    setEchGenerating(true)
    try {
      const publicName = echForm.query_server_name.trim() || form.host.trim() || 'ech.example.com'
      const pair = await generateEchKey(publicName)
      setEchForm((prev) => ({
        ...prev,
        key: pair.key ?? '',
        config: pair.config ?? '',
      }))
      toast.success(t('common.success'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setEchGenerating(false)
    }
  }

  function clearMachineFilter() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('machine_id')
      return next
    })
  }

  async function batchResetTraffic() {

    const ids = [...selectedIds]

    if (!ids.length) return

    if (

      !(await confirm({

        description: t('server.toolbar.batch_reset_traffic.description', {

          count: ids.length,

          defaultValue: `确定要重置选中的 ${ids.length} 个节点的流量吗？`,

        }),

        destructive: false,

      }))

    ) {

      return

    }

    try {

      await postJson('/server/manage/batchResetTraffic', { ids })

      toast.success(

        t('server.toolbar.batch_reset_traffic_success', {

          count: ids.length,

          defaultValue: `成功重置 ${ids.length} 个节点的流量`,

        }),

      )

      setSelectedIds(new Set())

      load()

    } catch (e) {

      toast.error(

        e instanceof Error ? e.message : t('server.toolbar.batch_reset_traffic_error', { defaultValue: '批量重置流量失败' }),

      )

    }

  }



  function enterSortMode() {

    setSortRows([...filtered])

    setSortMode(true)

    setSelectedIds(new Set())

  }



  function cancelSortMode() {

    setSortMode(false)

    setSortRows([])

    setDragIndex(null)

  }



  async function saveSort() {

    setSortSaving(true)

    try {

      const payload = sortRows.map((row, index) => ({ id: Number(row.id), order: index }))

      await postJson('/server/manage/sort', payload)

      toast.success(t('server.toolbar.sort.success', { defaultValue: '排序保存成功' }))

      setSortMode(false)

      load()

    } catch (e) {

      toast.error(e instanceof Error ? e.message : t('common.error'))

    } finally {

      setSortSaving(false)

    }

  }



  const filtered = useMemo(() => {

    let rows = data

    if (machineIdFilter) {
      rows = rows.filter((r) => String(r.machine_id ?? '') === machineIdFilter)
    }

    if (!search.trim()) return rows

    const q = search.toLowerCase()

    return rows.filter(

      (r) =>

        String(r.name ?? '').toLowerCase().includes(q) ||

        String(r.host ?? '').toLowerCase().includes(q),

    )

  }, [data, search, machineIdFilter])



  const tableData = sortMode ? sortRows : filtered



  const columns = useMemo<ColumnDef<NodeRow, unknown>[]>(

    () => [

      ...(sortMode

        ? [

            {

              id: 'sort',

              header: () => t('server.columns.sort'),

              cell: ({ row }: { row: { index: number } }) => (

                <SortRowControls

                  index={row.index}

                  total={sortRows.length}

                  draggable

                  onMoveUp={() => setSortRows((rows) => moveListItem(rows, row.index, 'up'))}

                  onMoveDown={() => setSortRows((rows) => moveListItem(rows, row.index, 'down'))}

                  onDragStart={() => setDragIndex(row.index)}

                  onDragOver={(e) => e.preventDefault()}

                  onDrop={() => {

                    if (dragIndex == null || dragIndex === row.index) return

                    setSortRows((rows) => reorderList(rows, dragIndex, row.index))

                    setDragIndex(null)

                  }}

                />

              ),

            } as ColumnDef<NodeRow, unknown>,

          ]

        : [

            {

              id: 'select',

              header: () => (

                <input

                  type="checkbox"

                  checked={filtered.length > 0 && selectedIds.size === filtered.length}

                  onChange={() => toggleSelectAll(filtered)}

                />

              ),

              cell: ({ row }) => (

                <input

                  type="checkbox"

                  checked={selectedIds.has(Number(row.original.id))}

                  onChange={() => toggleSelect(Number(row.original.id))}

                />

              ),

            } as ColumnDef<NodeRow, unknown>,

          ]),

      { accessorKey: 'id', header: () => t('server.columns.nodeId') },

      { accessorKey: 'name', header: () => t('server.columns.node') },

      { accessorKey: 'type', header: () => t('server.columns.type', { defaultValue: '类型' }) },

      {

        accessorKey: 'host',

        header: () => t('server.columns.address'),

        cell: ({ row }) => `${row.original.host}:${row.original.server_port ?? row.original.port}`,

      },

      {

        accessorKey: 'online',

        header: () => t('server.columns.onlineUsers.title'),

        cell: ({ row }) => (

          <div className="flex items-center gap-2 px-1">

            <Users className="h-4 w-4 text-muted-foreground" />

            <span className="font-medium">{String(row.original.online ?? 0)}</span>

          </div>

        ),

      },

      {

        accessorKey: 'rate',

        header: () => t('server.columns.rate.title'),

        cell: ({ row }) => (

          <span className="inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">

            {row.original.rate ?? 1} x

          </span>

        ),

      },

      {

        id: 'groups',

        header: () => t('server.form.groups.label', { defaultValue: '权限组' }),

        cell: ({ row }) => {

          const ids = Array.isArray(row.original.group_ids) ? row.original.group_ids : []

          if (!ids.length) return '—'

          const names = ids

            .map((id) => groups.find((g) => g.id === id)?.name ?? String(id))

            .join(', ')

          return names

        },

      },

      {

        accessorKey: 'show',

        header: () => t('server.columns.show'),

        cell: ({ row }) =>

          sortMode ? (

            row.original.show ? t('common.enabled', { defaultValue: '启用' }) : t('common.disabled', { defaultValue: '禁用' })

          ) : (

            <Switch checked={Boolean(row.original.show)} onCheckedChange={() => toggleShow(row.original)} />

          ),

      },

      ...(!sortMode

        ? [

            {

              id: 'actions',

              header: () => t('common.table.columns.actions', { defaultValue: '操作' }),

              cell: ({ row }: { row: { original: NodeRow } }) => (

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

                    <DropdownMenuItem onClick={() => copyNode(row.original)}>

                      {t('server.actions.copy', { defaultValue: '复制' })}

                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => resetNodeTraffic(row.original)}>

                      {t('server.toolbar.batch_reset_traffic.menu', { defaultValue: '重置流量' })}

                    </DropdownMenuItem>

                    <DropdownMenuItem className="text-destructive" onClick={() => deleteNode(row.original)}>

                      {t('common.delete', { defaultValue: '删除' })}

                    </DropdownMenuItem>

                  </DropdownMenuContent>

                </DropdownMenu>

              ),

            } as ColumnDef<NodeRow, unknown>,

          ]

        : []),

    ],

    [t, sortMode, sortRows, dragIndex, filtered, selectedIds, groups],

  )



  return (

    <div>

      <div className="mb-2">

        <h2 className="m-0 text-2xl font-bold tracking-tight">{t('server.manage.title')}</h2>

        <p className="mt-2 text-muted-foreground">{t('server.manage.description')}</p>

      </div>

      <div className="-mx-4 flex-1 overflow-auto px-4 py-1">

        <div className="flex w-full flex-col gap-4">

          <div className="flex flex-wrap items-center gap-2">

            {!sortMode ? (

              <Button variant="outline" size="sm" className="h-8" onClick={openCreate}>

                <Plus className="mr-2 h-4 w-4" />

                {t('server.form.add', { defaultValue: '添加节点' })}

              </Button>

            ) : null}

            <SortToolbar

              sortMode={sortMode}

              saving={sortSaving}

              hint={sortMode ? t('server.toolbar.sort.tip', { defaultValue: '拖拽节点进行排序，完成后点击保存' }) : undefined}

              onEdit={enterSortMode}

              onSave={saveSort}

              onCancel={cancelSortMode}

            />

            {!sortMode && selectedIds.size > 0 ? (

              <DropdownMenu>

                <DropdownMenuTrigger asChild>

                  <Button variant="outline" size="sm" className="h-8">

                    {t('server.toolbar.actions', { defaultValue: '操作' })} ({selectedIds.size})

                  </Button>

                </DropdownMenuTrigger>

                <DropdownMenuContent>

                  <DropdownMenuItem onClick={() => batchUpdateField('show', 1, 'server.toolbar.batch_show_success', 'server.toolbar.batch_show_error')}>

                    {t('server.toolbar.batch_show.menu', { defaultValue: '显示节点' })}

                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => batchUpdateField('show', 0, 'server.toolbar.batch_hide_success', 'server.toolbar.batch_hide_error')}>

                    {t('server.toolbar.batch_hide.menu', { defaultValue: '隐藏节点' })}

                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => batchUpdateField('enabled', true, 'server.toolbar.batch_enable_success', 'server.toolbar.batch_enable_error')}>

                    {t('server.toolbar.batch_enable.menu', { defaultValue: '启用节点' })}

                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => batchUpdateField('enabled', false, 'server.toolbar.batch_disable_success', 'server.toolbar.batch_disable_error')}>

                    {t('server.toolbar.batch_disable.menu', { defaultValue: '禁用节点' })}

                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={batchResetTraffic}>

                    {t('server.toolbar.batch_reset_traffic.menu', { defaultValue: '重置流量' })}

                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem className="text-destructive" onClick={batchDelete}>

                    {t('server.toolbar.batch_delete.menu', { defaultValue: '删除节点' })}

                  </DropdownMenuItem>

                </DropdownMenuContent>

              </DropdownMenu>

            ) : null}

            {machineIdFilter ? (
              <div className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-muted/40 px-2 text-xs">
                <span className="text-muted-foreground">{t('server.toolbar.server', { defaultValue: '服务器' })}:</span>
                <span className="font-medium">{activeMachine?.name ?? `#${machineIdFilter}`}</span>
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-muted"
                  onClick={clearMachineFilter}
                  aria-label={t('server.toolbar.reset', { defaultValue: '重置' })}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}

            <Input

              value={search}

              onChange={(e) => setSearch(e.target.value)}

              placeholder={t('common.search')}

              className={`h-8 max-w-xs ${inputCls}`}

              disabled={sortMode}

            />

          </div>

          <DataTable columns={columns} data={tableData} loading={loading} />

        </div>

      </div>



      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>

        <DialogContent className="!flex max-h-[837px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[576px]">

          <div className="flex shrink-0 items-start justify-between gap-4 border-b px-6 py-4">

            <div>

              <DialogTitle className="text-left">

                {editing ? t('server.form.edit_node') : t('server.form.new_node')}

              </DialogTitle>

              <p className="mt-1 text-sm text-muted-foreground">{t('server.manage.description')}</p>

            </div>

            <FormSelect
              className="w-40 shrink-0"
              value={form.type}
              onChange={(v) => setForm((f) => ({ ...f, type: v }))}
              options={[
                { value: '', label: t('server.form.type.placeholder') },
                ...NODE_TYPES.map((tp) => ({ value: tp, label: tp })),
              ]}
            />

          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="xb-stack-3 px-6 py-3">

            <div className="grid grid-cols-2 gap-4">

              <div className="xb-stack-2">

                <Label>{t('server.form.name.label')}</Label>

                <input

                  className={inputCls}

                  placeholder={t('server.form.name.placeholder')}

                  value={form.name}

                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}

                />

              </div>

              <div className="xb-stack-2">

                <Label>{t('server.form.rate.label')}</Label>

                <SuffixInput

                  suffix="x"

                  type="number"

                  value={form.rate}

                  onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}

                />

              </div>

            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5">

              <div>

                <Label>{t('server.form.dynamic_rate.enable_label')}</Label>

                <p className="text-xs text-muted-foreground">

                  {t('server.form.dynamic_rate.enable_description')}

                </p>

              </div>

              <Switch

                checked={form.rate_time_enable}

                onCheckedChange={(v) => setForm((f) => ({ ...f, rate_time_enable: v }))}

              />

            </div>

            <div className="grid grid-cols-2 gap-4">

              <div className="xb-stack-2">

                <Label>{t('server.form.traffic_limit.label')}(GB)</Label>

                <input
                  type="number"
                  className={inputCls}
                  placeholder={t('server.form.traffic_limit.placeholder')}
                  value={form.traffic_limit}
                  onChange={(e) => setForm((f) => ({ ...f, traffic_limit: e.target.value }))}
                />

              </div>

              <div className="xb-stack-2">

                <Label>
                  {t('server.form.code.label')}
                  ({t('server.form.code.optional')})
                </Label>

                <input

                  className={inputCls}

                  placeholder={t('server.form.code.placeholder')}

                  value={form.code}

                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}

                />

              </div>

            </div>

            <div className="xb-stack-2">

              <Label>{t('server.form.tags.label')}</Label>

              <TagInput

                value={form.tags}

                onChange={(tags) => setForm((f) => ({ ...f, tags }))}

                placeholder={t('server.form.tags.placeholder')}

              />

            </div>

            <div className="xb-stack-2">

              <div className="flex items-center justify-between gap-2">

                <Label>{t('server.form.groups.label')}</Label>

                <Link to="/server/group" className="text-xs text-primary hover:underline" onClick={() => setDialogOpen(false)}>

                  {t('server.form.groups.add')}

                </Link>

              </div>

              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-md border border-input p-2">
                {groups.length ? (
                  groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={g.id != null && form.group_ids.includes(g.id)}
                        onChange={() => g.id != null && toggleGroupId(g.id)}
                      />
                      {g.name}
                    </label>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t('server.form.groups.placeholder')}
                  </span>
                )}
              </div>

            </div>

            <div className="xb-stack-2">

              <Label>{t('server.form.host.label')}</Label>

              <input

                className={inputCls}

                placeholder={t('server.form.host.placeholder')}

                value={form.host}

                onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}

              />

            </div>

            <div className="grid grid-cols-2 gap-4">

              <div className="xb-stack-2">

                <Label>{t('server.form.port.label')}</Label>

                <input

                  className={inputCls}

                  placeholder={t('server.form.port.placeholder')}

                  value={form.port}

                  onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}

                />

              </div>

              <div className="xb-stack-2">

                <Label>{t('server.form.server_port.label')}</Label>

                <input

                  className={inputCls}

                  placeholder={t('server.form.server_port.placeholder')}

                  value={form.server_port}

                  onChange={(e) => setForm((f) => ({ ...f, server_port: e.target.value }))}

                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-4">

              <div className="xb-stack-2">

                <Label>{t('server.form.parent.label')}</Label>

                <FormSelect
                  value={form.parent_id}
                  onChange={(v) => setForm((f) => ({ ...f, parent_id: v }))}
                  options={[
                    { value: '', label: t('server.form.parent.none') },
                    ...data
                      .filter((n) => n.id !== editing?.id)
                      .map((n) => ({ value: String(n.id), label: String(n.name) })),
                  ]}
                />

              </div>

              <div className="xb-stack-2">

                <Label>{t('server.form.route.label')}</Label>

                <FormSelect
                  value={form.route_id}
                  onChange={(v) => setForm((f) => ({ ...f, route_id: v }))}
                  options={[
                    { value: '', label: t('server.form.route.placeholder') },
                    ...routes.map((r) => ({ value: String(r.id), label: String(r.name) })),
                  ]}
                />

              </div>

            </div>

            <div className="xb-stack-2">

              <Label>{t('server.form.machine.label')}</Label>

              <FormSelect
                value={form.machine_id}
                onChange={(v) => setForm((f) => ({ ...f, machine_id: v }))}
                options={[
                  { value: '', label: t('server.form.machine.none') },
                  ...machines.map((m) => ({ value: String(m.id), label: String(m.name) })),
                ]}
              />

            </div>

            {TLS_NODE_TYPES.has(form.type) ? (
              <div className="col-span-2 space-y-3 rounded-lg border border-dashed p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t('server.dynamic_form.ech.generate', { defaultValue: 'ECH' })}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 font-mono text-xs"
                    onClick={generateEchPair}
                    disabled={echGenerating}
                  >
                    {echGenerating ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                    )}
                    {t('server.dynamic_form.ech.generate', { defaultValue: '自动生成 ECH 密钥对' })}
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t('server.dynamic_form.ech.query_server_name.label', { defaultValue: 'ECH 查询域名' })}</Label>
                  <input
                    className={inputCls}
                    value={echForm.query_server_name}
                    onChange={(e) => setEchForm((f) => ({ ...f, query_server_name: e.target.value }))}
                    placeholder={t('server.dynamic_form.ech.query_server_name.placeholder', {
                      defaultValue: '可选，用于覆盖 HTTPS 记录查询域名',
                    })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t('server.dynamic_form.ech.config.label', { defaultValue: 'ECH 配置 (PEM)' })}</Label>
                  <textarea
                    className={textareaCls}
                    value={echForm.config}
                    onChange={(e) => setEchForm((f) => ({ ...f, config: e.target.value }))}
                    placeholder={t('server.dynamic_form.ech.config.placeholder', {
                      defaultValue: '粘贴 PEM 格式的 ECH 配置',
                    })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t('server.dynamic_form.ech.key.label', { defaultValue: 'ECH Key' })}</Label>
                  <textarea
                    className={textareaCls}
                    value={echForm.key}
                    onChange={(e) => setEchForm((f) => ({ ...f, key: e.target.value }))}
                    placeholder={t('server.dynamic_form.ech.key.placeholder', {
                      defaultValue: '当后端需要时粘贴 ECH key 内容',
                    })}
                  />
                </div>
              </div>
            ) : null}

          </div>
          </div>
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4">

            <Button variant="outline" onClick={() => setDialogOpen(false)}>

              {t('server.form.cancel')}

            </Button>

            <Button onClick={saveNode} disabled={saving || !form.type}>

              {t('server.form.submit')}

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

      <ConfirmDialog />

    </div>

  )

}


