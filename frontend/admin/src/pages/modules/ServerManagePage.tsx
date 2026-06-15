import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ColumnDef } from '@tanstack/react-table'

import * as Tooltip from '@radix-ui/react-tooltip'

import { IconDots } from '@tabler/icons-react'
import { ArrowRight, HardDrive, Info, Loader2, Lock, Plus, Sparkles, Users, X } from 'lucide-react'

import { Link, useSearchParams } from 'react-router-dom'

import { useTranslation } from 'react-i18next'

import { toast } from 'sonner'

import { toastApiError } from '@/lib/api-errors'
import { fetchJsonList, generateEchKey, postJson } from '@/lib/api'

import { cn } from '@/lib/utils'

import {
  formSubLabelCls,
  inputCls,
  serverDialogCompactInputCls,
  serverDialogFieldInputCls,
  serverDialogInputCls,
  serverDialogLabelCls,
  textareaCls,
} from '@/lib/form-styles'
import { DialogFormFooter } from '@/components/shared/DialogFormFooter'

import { moveListItem, reorderList } from '@/lib/list-sort'

import { DataTable } from '@/components/shared/DataTable'
import { FormMultiSelect } from '@/components/shared/FormMultiSelect'
import { FormSelect } from '@/components/shared/FormSelect'
import { SuffixInput } from '@/components/shared/SuffixInput'
import { TagInput } from '@/components/shared/TagInput'

import { SortRowControls, SortToolbar } from '@/components/shared/SortToolbar'

import {
  defaultProtocolSettings,
  readProtocolSettings,
  readShadowsocksCertConfig,
  ServerProtocolFields,
  toProtocolSettingsPayload,
  toShadowsocksCertConfigPayload,
  type ProtocolFormSettings,
  type ShadowsocksProtocolForm,
  type VmessProtocolForm,
} from '@/components/server/ServerProtocolFields'

import { TLS_OBJECT_NODE_TYPES } from '@/lib/server-protocol-settings'

import { buildProtocolSettingsForSave } from '@/lib/protocol-settings-save'

import { Button } from '@/components/ui/button'

import {

  Dialog,

  DialogContent,

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

type LoadStatus = {
  cpu?: number
  mem?: { total?: number; used?: number }
  swap?: { total?: number; used?: number }
  disk?: { total?: number; used?: number }
  updated_at?: number
}

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

  u?: number

  d?: number

  transfer_enable?: number

  banned?: boolean

  load_status?: LoadStatus | null

  metrics?: Record<string, unknown>

  group_ids?: number[]

  sort?: number

  machine_id?: number | null

  protocol_settings?: Record<string, unknown>

  cert_config?: Record<string, unknown> | null

}

function formatBytes(n?: number | null) {
  if (n == null || n <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = Math.floor(Math.log(n) / Math.log(1024))
  if (i < 0) i = 0
  if (i >= units.length) i = units.length - 1
  return `${parseFloat((n / 1024 ** i).toFixed(2))} ${units[i]}`
}

function usedPercent(used: number, total: number) {
  return total > 0 ? (used / total) * 100 : 0
}

function loadPercents(loadStatus?: LoadStatus | null) {
  if (!loadStatus) return { cpu: 0, mem: 0, disk: 0 }
  return {
    cpu: loadStatus.cpu ?? 0,
    mem: usedPercent(loadStatus.mem?.used ?? 0, loadStatus.mem?.total ?? 0),
    disk: usedPercent(loadStatus.disk?.used ?? 0, loadStatus.disk?.total ?? 0),
  }
}

function loadBarTone(pct: number) {
  if (pct >= 90) return 'bg-destructive'
  if (pct >= 70) return 'bg-amber-500'
  return 'bg-primary'
}

function LoadBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, value)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="font-mono text-[10px] font-medium">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full transition-all', loadBarTone(pct))} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}



const NODE_TYPES = [
  'shadowsocks',
  'vmess',
  'trojan',
  'vless',
  'hysteria',
  'tuic',
  'anytls',
] as const

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

function shouldShowEchFields(type: string, protocolSettings: ProtocolFormSettings | null) {
  if (!protocolSettings) return false
  if (TLS_OBJECT_NODE_TYPES.has(type)) return true
  if (!TLS_NODE_TYPES.has(type)) return false
  if (type === 'vmess') return (protocolSettings as VmessProtocolForm).tls === 1
  if (type === 'trojan' || type === 'vless') {
    return (protocolSettings as { tls?: number }).tls === 1
  }
  return false
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
  route_ids: number[]
  machine_id: string
  rate_time_enable: boolean
}

function defaultCreatePayload(form: ServerForm, show = 1) {

  const type = form.type || 'shadowsocks'

  const trafficGb = form.traffic_limit.trim() === '' ? 0 : Number(form.traffic_limit)

  const base: Record<string, unknown> = {

    type,

    name: form.name,

    host: form.host,

    port: form.port,

    server_port: Number(form.server_port),

    rate: Number(form.rate) || 1,

    show,

    group_ids: form.group_ids,

    code: form.code || undefined,

    tags: form.tags.length ? form.tags : undefined,

    parent_id: form.parent_id ? Number(form.parent_id) : null,

    route_ids: form.route_ids,

    machine_id: form.machine_id ? Number(form.machine_id) : null,

    rate_time_enable: form.rate_time_enable,

    transfer_enable: trafficGb > 0 ? Math.round(trafficGb * 1073741824) : 0,

  }

  const protocolDefaults = defaultProtocolSettings(type)
  if (protocolDefaults) {
    base.protocol_settings = toProtocolSettingsPayload(type, protocolDefaults)
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
    route_ids: [],
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

  const [protocolSettings, setProtocolSettings] = useState<ProtocolFormSettings | null>(null)

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

      .catch((e) => toastApiError(e, toast, t, t('common.error')))

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

    setProtocolSettings(null)

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

      route_ids: routeIds,

      machine_id: row.machine_id != null ? String(row.machine_id) : '',

      rate_time_enable: Boolean(row.rate_time_enable),

    })

    setEchForm(readEchSettings(row.protocol_settings))

    const type = String(row.type ?? 'shadowsocks')
    let settings = readProtocolSettings(type, row.protocol_settings)
    if (type === 'shadowsocks' && settings) {
      const certRaw = row.cert_config
      settings = {
        ...settings,
        cert_config: readShadowsocksCertConfig(
          certRaw && typeof certRaw === 'object' && !Array.isArray(certRaw) ? certRaw : undefined,
        ),
      }
    }
    setProtocolSettings(settings)

    setDialogOpen(true)

  }

  function handleTypeChange(type: string) {
    setForm((f) => ({ ...f, type }))
    setProtocolSettings(defaultProtocolSettings(type))
    setEchForm({ key: '', config: '', query_server_name: '' })
  }



  async function saveNode() {

    if (!form.type) {

      toast.error(t('server.form.type.select_error'))

      return

    }

    setSaving(true)

    try {

      const baseProtocol =
        editing?.protocol_settings ??
        (defaultCreatePayload(form).protocol_settings as Record<string, unknown> | undefined) ??
        {}

      let protocol_settings: Record<string, unknown> = { ...baseProtocol }

      if (protocolSettings) {
        protocol_settings = buildProtocolSettingsForSave(
          form.type,
          baseProtocol,
          protocolSettings,
          echForm,
        )
      }

      const payload: Record<string, unknown> = editing

        ? {

            ...editing,

            ...defaultCreatePayload(form, Number(editing.show ?? 1)),

            id: editing.id,

            show: Number(editing.show ?? 1),

            protocol_settings,

          }

        : { ...defaultCreatePayload(form), protocol_settings }

      if (form.type === 'shadowsocks' && protocolSettings) {
        payload.cert_config =
          toShadowsocksCertConfigPayload((protocolSettings as ShadowsocksProtocolForm).cert_config) ??
          null
      }

      await postJson('/server/manage/save', payload)

      toast.success(t('common.success'))

      setDialogOpen(false)

      load()

    } catch (e) {

      toastApiError(e, toast, t, t('common.error'))

    } finally {

      setSaving(false)

    }

  }



  async function toggleShow(row: NodeRow) {

    try {

      await postJson('/server/manage/update', { id: row.id, show: row.show ? 0 : 1 })

      load()

    } catch (e) {

      toastApiError(e, toast, t, t('common.error'))

    }

  }



  async function copyNode(row: NodeRow) {

    try {

      await postJson('/server/manage/copy', { id: row.id })

      toast.success(t('common.success'))

      load()

    } catch (e) {

      toastApiError(e, toast, t, t('common.error'))

    }

  }



  async function deleteNode(row: NodeRow) {

    if (
      !(await confirm(
        t('server.columns.actions_dropdown.delete.title'),
        t('server.columns.actions_dropdown.delete.description'),
        {
          confirmLabel: t('server.columns.actions_dropdown.delete.confirm'),
        },
      ))
    )
      return

    try {

      await postJson('/server/manage/drop', { id: row.id })

      toast.success(t('common.success'))

      load()

    } catch (e) {

      toastApiError(e, toast, t, t('common.error'))

    }

  }



  async function resetNodeTraffic(row: NodeRow) {

    try {

      await postJson('/server/manage/resetTraffic', { id: row.id })

      toast.success(t('common.success'))

      load()

    } catch (e) {

      toastApiError(e, toast, t, t('common.error'))

    }

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

        t('server.toolbar.batch_delete.description', { count: ids.length }),

      ))

    ) {

      return

    }

    try {

      await postJson('/server/manage/batchDelete', { ids })

      toast.success(

        t('server.toolbar.batch_delete_success', { count: ids.length }),

      )

      setSelectedIds(new Set())

      load()

    } catch (e) {

      toastApiError(e, toast, t, t('server.toolbar.batch_delete_error'))

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
      toast.success(t(successKey, { count: ids.length }))
      setSelectedIds(new Set())
      load()
    } catch (e) {
      toastApiError(e, toast, t, t(errorKey))
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
      toastApiError(e, toast, t, t('common.error'))
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

        description: t('server.toolbar.batch_reset_traffic.description', { count: ids.length }),

        destructive: false,

      }))

    ) {

      return

    }

    try {

      await postJson('/server/manage/batchResetTraffic', { ids })

      toast.success(

        t('server.toolbar.batch_reset_traffic_success', { count: ids.length }),

      )

      setSelectedIds(new Set())

      load()

    } catch (e) {

      toastApiError(e, toast, t, t('server.toolbar.batch_reset_traffic_error'))

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

      toast.success(t('server.toolbar.sort.success'))

      setSortMode(false)

      load()

    } catch (e) {

      toastApiError(e, toast, t, t('common.error'))

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

      { accessorKey: 'type', header: () => t('server.columns.type') },

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

        id: 'traffic',

        header: () => (
          <span title={t('server.columns.traffic.tooltip')}>{t('server.columns.traffic.title')}</span>
        ),

        cell: ({ row }) => {

          const used = Number(row.original.u ?? 0) + Number(row.original.d ?? 0)

          const total = Number(row.original.transfer_enable ?? 0)

          const banned = Boolean(row.original.banned)

          const usedLabel = formatBytes(used)

          const totalLabel = formatBytes(total)

          if (total <= 0) {

            return <div className="text-sm text-muted-foreground">{usedLabel}</div>

          }

          const pct = Math.min((used / total) * 100, 100)

          return (

            <Tooltip.Provider delayDuration={100}>

              <Tooltip.Root>

                <Tooltip.Trigger asChild>

                  <div className="flex cursor-default items-center gap-2">

                    <div className="h-1.5 w-12 rounded-full bg-secondary">

                      <div

                        className={cn(

                          'h-full rounded-full transition-all',

                          banned || pct > 90 ? 'bg-destructive' : 'bg-primary',

                        )}

                        style={{ width: `${pct}%` }}

                      />

                    </div>

                    <span

                      className={cn(

                        'text-xs tabular-nums text-muted-foreground',

                        banned && 'text-destructive',

                      )}

                    >

                      {usedLabel}

                    </span>

                  </div>

                </Tooltip.Trigger>

                <Tooltip.Portal>

                  <Tooltip.Content

                    side="bottom"

                    className="z-50 rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"

                  >

                    <div className="space-y-1">

                      <p>

                        {t('server.columns.traffic.used')}: {usedLabel}

                      </p>

                      <p>

                        {t('server.columns.traffic.total')}: {totalLabel}

                      </p>

                      <p>

                        {t('server.columns.traffic.percentage')}: {pct.toFixed(1)}%

                      </p>

                    </div>

                    <Tooltip.Arrow className="fill-border" />

                  </Tooltip.Content>

                </Tooltip.Portal>

              </Tooltip.Root>

            </Tooltip.Provider>

          )

        },

      },

      {

        id: 'loadStatus',

        header: () => (
          <span title={t('server.columns.loadStatus.tooltip')}>
            {t('server.columns.loadStatus.title')}
          </span>
        ),

        cell: ({ row }) => {

          const load = row.original.load_status

          if (!load) {

            return (

              <span className="text-xs text-muted-foreground">

                {t('server.columns.loadStatus.noData')}

              </span>

            )

          }

          const { cpu, mem, disk } = loadPercents(load)

          return (

            <div className="w-[180px] space-y-2">

              <LoadBar label={t('server.columns.loadStatus.cpu')} value={cpu} />

              <LoadBar label={t('server.columns.loadStatus.memory')} value={mem} />

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">

                <span className="flex items-center gap-1">

                  <HardDrive className="size-3" />

                  {t('server.columns.loadStatus.disk')}

                </span>

                <span className="font-mono">

                  {formatBytes(load.disk?.used)} / {formatBytes(load.disk?.total)}

                </span>

              </div>

              {disk > 0 ? (

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">

                  <div

                    className={cn('h-full transition-all', loadBarTone(disk))}

                    style={{ width: `${Math.min(100, disk)}%` }}

                  />

                </div>

              ) : null}

            </div>

          )

        },

      },

      {

        id: 'groups',

        header: () => t('server.form.groups.label'),

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

            row.original.show ? t('common.enabled') : t('common.disabled')

          ) : (

            <Switch checked={Boolean(row.original.show)} onCheckedChange={() => toggleShow(row.original)} />

          ),

      },

      ...(!sortMode

        ? [

            {

              id: 'actions',

              header: () => t('common.table.columns.actions'),

              cell: ({ row }: { row: { original: NodeRow } }) => (

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

                    <DropdownMenuItem onClick={() => copyNode(row.original)}>

                      {t('server.actions.copy')}

                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => resetNodeTraffic(row.original)}>

                      {t('server.toolbar.batch_reset_traffic.menu')}

                    </DropdownMenuItem>

                    <DropdownMenuItem className="text-destructive" onClick={() => deleteNode(row.original)}>

                      {t('common.delete')}

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

                {t('server.form.add_node')}

              </Button>

            ) : null}

            <SortToolbar

              sortMode={sortMode}

              saving={sortSaving}

              hint={sortMode ? t('server.toolbar.sort.tip') : undefined}

              onEdit={enterSortMode}

              onSave={saveSort}

              onCancel={cancelSortMode}

            />

            {!sortMode && selectedIds.size > 0 ? (

              <DropdownMenu>

                <DropdownMenuTrigger asChild>

                  <Button variant="outline" size="sm" className="h-8">

                    {t('server.toolbar.actions')} ({selectedIds.size})

                  </Button>

                </DropdownMenuTrigger>

                <DropdownMenuContent>

                  <DropdownMenuItem onClick={() => batchUpdateField('show', 1, 'server.toolbar.batch_show_success', 'server.toolbar.batch_show_error')}>

                    {t('server.toolbar.batch_show.menu')}

                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => batchUpdateField('show', 0, 'server.toolbar.batch_hide_success', 'server.toolbar.batch_hide_error')}>

                    {t('server.toolbar.batch_hide.menu')}

                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => batchUpdateField('enabled', true, 'server.toolbar.batch_enable_success', 'server.toolbar.batch_enable_error')}>

                    {t('server.toolbar.batch_enable.menu')}

                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => batchUpdateField('enabled', false, 'server.toolbar.batch_disable_success', 'server.toolbar.batch_disable_error')}>

                    {t('server.toolbar.batch_disable.menu')}

                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={batchResetTraffic}>

                    {t('server.toolbar.batch_reset_traffic.menu')}

                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem className="text-destructive" onClick={batchDelete}>

                    {t('server.toolbar.batch_delete.menu')}

                  </DropdownMenuItem>

                </DropdownMenuContent>

              </DropdownMenu>

            ) : null}

            {machineIdFilter ? (
              <div className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-muted/40 px-2 text-xs">
                <span className="text-muted-foreground">{t('server.toolbar.server')}:</span>
                <span className="font-medium">{activeMachine?.name ?? `#${machineIdFilter}`}</span>
                <button
                  type="button"
                  className="rounded p-0.5 hover:bg-muted"
                  onClick={clearMachineFilter}
                  aria-label={t('server.toolbar.reset')}
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

        <DialogContent className="!flex h-[838px] max-h-[838px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[576px]">

          <div className="shrink-0 border-b px-6 pb-4 pt-6">

            <div className="flex items-center justify-between pr-8">

              <div className="flex items-center gap-3">

                <DialogTitle className="font-semibold font-mono text-lg tracking-tight">

                  {editing ? t('server.form.edit_node') : t('server.form.new_node')}

                </DialogTitle>

              </div>

              <FormSelect
                className="h-8 w-[150px] shrink-0 font-mono text-xs"
                value={form.type}
                onChange={handleTypeChange}
                options={[
                  { value: '', label: t('server.form.type.placeholder') },
                  ...NODE_TYPES.map((tp) => ({ value: tp, label: tp })),
                ]}
              />

            </div>

            <p className="mt-1.5 font-mono text-xs opacity-70">{t('server.manage.description')}</p>

          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
          <div className="space-y-4">

            <div className="flex gap-4">

              <div className="min-w-0 flex-[2] space-y-1">

                <Label className={serverDialogLabelCls}>{t('server.form.name.label')}</Label>

                <input

                  className={serverDialogFieldInputCls}

                  placeholder={t('server.form.name.placeholder')}

                  value={form.name}

                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}

                />

              </div>

              <div className="min-w-0 flex-1 space-y-1">

                <Label className={`${serverDialogLabelCls} flex items-center gap-1.5`}>
                  {t('server.form.rate.label')}
                  {form.parent_id ? (
                    <Tooltip.Provider delayDuration={100}>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <span className="inline-flex opacity-70">
                            <Lock className="size-3" />
                          </span>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            side="top"
                            className="z-50 max-w-72 rounded-md border bg-popover px-3 py-1.5 font-mono text-[11px] text-popover-foreground shadow-md"
                          >
                            {t('server.form.rate.child_node_tooltip')}
                            <Tooltip.Arrow className="fill-border" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  ) : null}
                </Label>

                <SuffixInput

                  className={cn(serverDialogInputCls, form.parent_id && 'bg-muted/50')}

                  suffix="x"

                  type="number"

                  value={form.rate}

                  disabled={Boolean(form.parent_id)}

                  onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}

                />

              </div>

            </div>

            <div className="flex items-center justify-between gap-3">

              <div>

                <Label className={serverDialogLabelCls}>{t('server.form.dynamic_rate.enable_label')}</Label>

                <p className="m-0 text-[11px] leading-tight text-muted-foreground">

                  {t('server.form.dynamic_rate.enable_description')}

                </p>

              </div>

              <Switch

                checked={form.rate_time_enable}

                onCheckedChange={(v) => setForm((f) => ({ ...f, rate_time_enable: v }))}

              />

            </div>

            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-1">

                <Label className={serverDialogLabelCls}>{t('server.form.traffic_limit.label')}(GB)</Label>

                <input
                  type="number"
                  className={serverDialogCompactInputCls}
                  placeholder={t('server.form.traffic_limit.placeholder')}
                  value={form.traffic_limit}
                  onChange={(e) => setForm((f) => ({ ...f, traffic_limit: e.target.value }))}
                />

              </div>

              <div className="space-y-1">

                <Label className={serverDialogLabelCls}>
                  {t('server.form.code.label')}
                  ({t('server.form.code.optional')})
                </Label>

                <input

                  className={serverDialogCompactInputCls}

                  placeholder={t('server.form.code.placeholder')}

                  value={form.code}

                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}

                />

              </div>

            </div>

            <div className="space-y-1">

              <Label className={serverDialogLabelCls}>{t('server.form.tags.label')}</Label>

              <TagInput

                className={serverDialogInputCls}

                value={form.tags}

                onChange={(tags) => setForm((f) => ({ ...f, tags }))}

                placeholder={t('server.form.tags.placeholder')}

              />

            </div>

            <div className="space-y-1">

              <Label className={serverDialogLabelCls}>
                {t('server.form.groups.label')}
                <Link
                  to="/server/group"
                  className="text-[11px] text-primary hover:underline"
                  onClick={() => setDialogOpen(false)}
                >
                  {t('server.form.groups.add')}
                </Link>
              </Label>

              <FormMultiSelect
                className={serverDialogCompactInputCls}
                value={form.group_ids}
                onChange={(group_ids) => setForm((f) => ({ ...f, group_ids }))}
                options={groups
                  .filter((g): g is GroupRow & { id: number } => g.id != null)
                  .map((g) => ({ value: g.id, label: String(g.name) }))}
                placeholder={t('server.form.groups.placeholder')}
                emptyText={t('server.form.groups.empty')}
              />

              <label className={formSubLabelCls} aria-hidden="true" />

            </div>

            <div className="space-y-1">

              <Label className={serverDialogLabelCls}>{t('server.form.host.label')}</Label>

              <input

                className={serverDialogFieldInputCls}

                placeholder={t('server.form.host.placeholder')}

                value={form.host}

                onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}

              />

            </div>

            <div className="flex gap-2">

              <div className="min-w-0 flex-1 space-y-1">

                <Label className={`${serverDialogLabelCls} flex items-center gap-1.5`}>
                  {t('server.form.port.label')}
                  <Tooltip.Provider delayDuration={100}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button type="button" className="inline-flex opacity-70">
                          <Info className="size-3" />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          side="top"
                          sideOffset={8}
                          className="z-50 max-w-80 rounded-md border bg-popover p-3 font-mono text-[11px] text-popover-foreground shadow-md"
                        >
                          {t('server.form.port.tooltip')}
                          <Tooltip.Arrow className="fill-border" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </Label>

                <div className="flex items-center gap-1">
                  <input
                    className={cn(serverDialogFieldInputCls, 'min-w-0 flex-1')}
                    placeholder={t('server.form.port.placeholder')}
                    value={form.port}
                    onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                  />
                  <Tooltip.Provider delayDuration={100}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                          onClick={() => {
                            if (form.port) {
                              setForm((f) => ({ ...f, server_port: f.port }))
                            }
                          }}
                        >
                          <ArrowRight className="size-3" />
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          side="right"
                          className="z-50 rounded-md border bg-popover px-3 py-1.5 font-mono text-[11px] text-popover-foreground shadow-md"
                        >
                          {t('server.form.port.sync')}
                          <Tooltip.Arrow className="fill-border" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </div>

              </div>

              <div className="min-w-0 flex-1 space-y-1">

                <Label className={`${serverDialogLabelCls} flex items-center gap-1.5`}>
                  {t('server.form.server_port.label')}
                  <Tooltip.Provider delayDuration={100}>
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <button type="button" className="inline-flex opacity-70">
                          <Info className="size-3" />
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          side="top"
                          sideOffset={8}
                          className="z-50 max-w-80 rounded-md border bg-popover p-3 font-mono text-[11px] text-popover-foreground shadow-md"
                        >
                          {t('server.form.server_port.tooltip')}
                          <Tooltip.Arrow className="fill-border" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </Label>

                <input
                  className={serverDialogFieldInputCls}
                  placeholder={t('server.form.server_port.placeholder')}
                  value={form.server_port}
                  onChange={(e) => setForm((f) => ({ ...f, server_port: e.target.value }))}
                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-1">

                <Label className={serverDialogLabelCls}>{t('server.form.parent.label')}</Label>

                <FormSelect
                  className={serverDialogInputCls}
                  value={form.parent_id}
                  onChange={(v) => {
                    const parent = v ? data.find((n) => String(n.id) === v) : null
                    setForm((f) => ({
                      ...f,
                      parent_id: v,
                      rate: parent ? String(parent.rate ?? 1) : f.rate,
                    }))
                  }}
                  options={[
                    { value: '', label: t('server.form.parent.none') },
                    ...data
                      .filter((n) => n.id !== editing?.id)
                      .map((n) => ({ value: String(n.id), label: String(n.name) })),
                  ]}
                />

              </div>

              <div className="space-y-1">

                <Label className={serverDialogLabelCls}>{t('server.form.route.label')}</Label>

                <FormMultiSelect
                  className={serverDialogCompactInputCls}
                  value={form.route_ids}
                  onChange={(route_ids) => setForm((f) => ({ ...f, route_ids }))}
                  options={routes
                    .filter((r): r is RouteRow & { id: number } => r.id != null)
                    .map((r) => ({ value: r.id, label: String(r.name) }))}
                  placeholder={t('server.form.route.placeholder')}
                  emptyText={t('server.form.route.empty')}
                />

                <label className={formSubLabelCls} aria-hidden="true" />

              </div>

            </div>

            <div className="space-y-1">

              <Label className={serverDialogLabelCls}>{t('server.form.machine.label')}</Label>

              <FormSelect
                className={serverDialogInputCls}
                value={form.machine_id}
                onChange={(v) => setForm((f) => ({ ...f, machine_id: v }))}
                options={[
                  { value: '', label: t('server.form.machine.none') },
                  ...machines.map((m) => ({ value: String(m.id), label: String(m.name) })),
                ]}
              />

            </div>

            {protocolSettings ? (
              <ServerProtocolFields
                type={form.type}
                value={protocolSettings}
                onChange={setProtocolSettings}
              />
            ) : null}

            {shouldShowEchFields(form.type, protocolSettings) ? (
              <div className="col-span-2 space-y-2 rounded-lg border border-dashed p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className={serverDialogLabelCls}>{t('server.dynamic_form.ech.generate')}</Label>
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
                    {t('server.dynamic_form.ech.generate')}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className={serverDialogLabelCls}>{t('server.dynamic_form.ech.query_server_name.label')}</Label>
                  <input
                    className={serverDialogFieldInputCls}
                    value={echForm.query_server_name}
                    onChange={(e) => setEchForm((f) => ({ ...f, query_server_name: e.target.value }))}
                    placeholder={t('server.dynamic_form.ech.query_server_name.placeholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={serverDialogLabelCls}>{t('server.dynamic_form.ech.config.label')}</Label>
                  <textarea
                    className={`${textareaCls} font-mono text-xs`}
                    value={echForm.config}
                    onChange={(e) => setEchForm((f) => ({ ...f, config: e.target.value }))}
                    placeholder={t('server.dynamic_form.ech.config.placeholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={serverDialogLabelCls}>{t('server.dynamic_form.ech.key.label')}</Label>
                  <textarea
                    className={`${textareaCls} font-mono text-xs`}
                    value={echForm.key}
                    onChange={(e) => setEchForm((f) => ({ ...f, key: e.target.value }))}
                    placeholder={t('server.dynamic_form.ech.key.placeholder')}
                  />
                </div>
              </div>
            ) : null}

          </div>
          </div>

          <DialogFormFooter
            onCancel={() => setDialogOpen(false)}
            onSubmit={saveNode}
            cancelLabel={t('server.form.cancel')}
            submitLabel={t('server.form.submit')}
            submitting={saving}
            submitDisabled={!form.type}
          />

        </DialogContent>

      </Dialog>

      <ConfirmDialog />

    </div>

  )

}


