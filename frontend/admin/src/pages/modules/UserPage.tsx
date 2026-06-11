import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { IconDots } from '@tabler/icons-react'
import { ArrowUpDown, Filter, Mail, Plus, ShieldBan } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  adminApi,
  downloadAdminFile,
  fetchJsonList,
  fetchJsonObject,
  postJson,
  type PaginatedResult,
} from '@/lib/api'
import { inputCls, textareaCls } from '@/lib/form-styles'
import { DataTable } from '@/components/shared/DataTable'
import { ExpireDateInput } from '@/components/shared/ExpireDateInput'
import { FormSelect } from '@/components/shared/FormSelect'
import { SuffixInput } from '@/components/shared/SuffixInput'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

type UserRow = {
  id?: number
  email?: string
  plan_id?: number | null
  balance?: number
  expired_at?: number | null
  created_at?: number
  banned?: boolean | number
  transfer_enable?: number
  u?: number
  d?: number
  commission_balance?: number
  commission_rate?: number
  commission_type?: number
  discount?: number
  speed_limit?: number | null
  device_limit?: number | null
  is_admin?: boolean
  is_staff?: boolean
  remarks?: string
  subscribe_url?: string
  invite_user?: { email?: string }
}

type PlanRow = { id?: number; name?: string }

type TrafficResetHistoryRow = {
  id?: number
  reset_type?: string
  reset_type_name?: string
  reset_time?: string | number
  old_traffic?: { upload?: number; download?: number; total?: number; formatted?: string }
  trigger_source?: string
  trigger_source_name?: string
  metadata?: Record<string, unknown>
}

type TrafficResetHistoryData = {
  user?: {
    id?: number
    email?: string
    reset_count?: number
    last_reset_at?: number | null
    next_reset_at?: number | null
  }
  history?: TrafficResetHistoryRow[]
}

type FilterCondition = {
  id: string
  field: string
  operator: 'contains' | 'eq' | 'gt' | 'lt'
  value: string
}

type SortRule = { id: string; desc: boolean }

const FILTER_FIELDS = [
  'email',
  'id',
  'plan_id',
  'transfer_enable',
  'total_used',
  'online_count',
  'expired_at',
  'uuid',
  'token',
  'banned',
  'remark',
  'inviter_email',
  'invite_user_id',
  'is_admin',
  'is_staff',
] as const

const ORDER_PERIODS = [
  'month_price',
  'quarter_price',
  'half_year_price',
  'year_price',
  'two_year_price',
  'three_year_price',
  'onetime_price',
  'reset_price',
] as const

function formatTs(ts?: number | null) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString()
}

function formatDateTime(value?: string | number | null) {
  if (!value) return '—'
  if (typeof value === 'number') return formatTs(value)
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function filterValueForApi(cond: FilterCondition): string | number {
  const raw = cond.value.trim()
  if (!raw) return ''
  if (cond.operator === 'contains') return raw
  return `${cond.operator}:${raw}`
}

function buildFilterArray(
  emailSearch: string,
  conditions: FilterCondition[],
): { id: string; value: string | number }[] {
  const filters: { id: string; value: string | number }[] = []
  if (emailSearch.trim()) {
    filters.push({ id: 'email', value: emailSearch.trim() })
  }
  for (const cond of conditions) {
    if (!cond.field || !cond.value.trim()) continue
    const value = filterValueForApi(cond)
    if (value === '') continue
    filters.push({ id: cond.field, value })
  }
  return filters
}

export default function UserPage() {
  const { t } = useTranslation()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const navigate = useNavigate()
  const [data, setData] = useState<UserRow[]>([])
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [advancedConditions, setAdvancedConditions] = useState<FilterCondition[]>([])
  const [draftConditions, setDraftConditions] = useState<FilterCondition[]>([])
  const [sorts, setSorts] = useState<SortRule[]>([])

  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  const [mailOpen, setMailOpen] = useState(false)
  const [mailSubject, setMailSubject] = useState('')
  const [mailContent, setMailContent] = useState('')
  const [mailSending, setMailSending] = useState(false)

  const [banOpen, setBanOpen] = useState(false)
  const [banning, setBanning] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [trafficResetUser, setTrafficResetUser] = useState<UserRow | null>(null)
  const [trafficResetTab, setTrafficResetTab] = useState<'reset' | 'history'>('reset')
  const [trafficResetReason, setTrafficResetReason] = useState('')
  const [trafficResetting, setTrafficResetting] = useState(false)
  const [trafficResetHistory, setTrafficResetHistory] = useState<TrafficResetHistoryData | null>(
    null,
  )
  const [trafficResetHistoryLoading, setTrafficResetHistoryLoading] = useState(false)

  const [assignUser, setAssignUser] = useState<UserRow | null>(null)
  const [assignForm, setAssignForm] = useState({
    plan_id: '',
    period: 'month_price',
    total_amount: '',
  })
  const [assigning, setAssigning] = useState(false)

  const filters = useMemo(
    () => buildFilterArray(search, advancedConditions),
    [search, advancedConditions],
  )

  const buildBulkBody = useCallback(() => {
    const body: Record<string, unknown> = {}
    if (selectedIds.size > 0) {
      body.scope = 'selected'
      body.user_ids = Array.from(selectedIds)
    } else if (filters.length > 0) {
      body.scope = 'filtered'
      body.filter = filters
    } else {
      body.scope = 'all'
    }
    if (sorts.length) body.sort = sorts
    return body
  }, [selectedIds, filters, sorts])

  const load = useCallback(() => {
    setLoading(true)
    const body: Record<string, unknown> = { current: page, pageSize }
    if (filters.length) body.filter = filters
    if (sorts.length) body.sort = sorts

    adminApi<PaginatedResult<UserRow>>('/user/fetch', {
      method: 'POST',
      body: JSON.stringify(body),
    })
      .then((res) => {
        setData(Array.isArray(res.data) ? res.data : [])
        setTotal(res.total ?? 0)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [page, pageSize, filters, sorts, t])

  useEffect(() => {
    fetchJsonList('/plan/fetch').then((rows) => setPlans(rows as PlanRow[]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const loadTrafficResetHistory = useCallback(
    async (userId: number) => {
      setTrafficResetHistoryLoading(true)
      try {
        const data = await fetchJsonObject<TrafficResetHistoryData>(
          `/traffic-reset/user/${userId}/history`,
          { method: 'GET' },
        )
        setTrafficResetHistory(data)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t('common.error'))
        setTrafficResetHistory(null)
      } finally {
        setTrafficResetHistoryLoading(false)
      }
    },
    [t],
  )

  useEffect(() => {
    if (trafficResetTab !== 'history' || !trafficResetUser?.id) return
    void loadTrafficResetHistory(trafficResetUser.id)
  }, [trafficResetTab, trafficResetUser?.id, loadTrafficResetHistory])

  function openTrafficReset(user: UserRow, tab: 'reset' | 'history' = 'reset') {
    setTrafficResetUser(user)
    setTrafficResetTab(tab)
    setTrafficResetReason('')
    if (tab !== 'history') {
      setTrafficResetHistory(null)
    }
  }

  function closeTrafficReset() {
    setTrafficResetUser(null)
    setTrafficResetTab('reset')
    setTrafficResetReason('')
    setTrafficResetHistory(null)
  }

  function toggleSort(columnId: string) {
    setSorts((prev) => {
      const existing = prev.find((s) => s.id === columnId)
      if (!existing) return [{ id: columnId, desc: true }]
      if (existing.desc) return [{ id: columnId, desc: false }]
      return []
    })
    setPage(1)
  }

  function toggleRow(id?: number) {
    if (!id) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePageAll() {
    const pageIds = data.map((r) => r.id).filter((id): id is number => id != null)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  function openAdvanced() {
    setDraftConditions(
      advancedConditions.length
        ? advancedConditions.map((c) => ({ ...c }))
        : [{ id: crypto.randomUUID(), field: 'email', operator: 'contains', value: '' }],
    )
    setAdvancedOpen(true)
  }

  function applyAdvanced() {
    setAdvancedConditions(draftConditions.filter((c) => c.field && c.value.trim()))
    setAdvancedOpen(false)
    setPage(1)
  }

  function clearAdvanced() {
    setDraftConditions([])
    setAdvancedConditions([])
    setAdvancedOpen(false)
    setPage(1)
  }

  async function exportCsv() {
    setExporting(true)
    try {
      await downloadAdminFile(
        '/user/dumpCSV',
        { method: 'POST', jsonBody: buildBulkBody() },
        'users.csv',
      )
      toast.success(t('user.messages.export.success', { defaultValue: '导出成功' }))
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : t('user.messages.export.failed', { defaultValue: '导出失败' }),
      )
    } finally {
      setExporting(false)
    }
  }

  async function sendMail() {
    if (!mailSubject.trim() || !mailContent.trim()) {
      toast.error(
        t('user.messages.send_mail.required_fields', { defaultValue: '请填写所有必填字段' }),
      )
      return
    }
    setMailSending(true)
    try {
      await postJson('/user/sendMail', {
        ...buildBulkBody(),
        subject: mailSubject.trim(),
        content: mailContent.trim(),
      })
      toast.success(t('user.messages.send_mail.success', { defaultValue: '邮件发送成功' }))
      setMailOpen(false)
      setMailSubject('')
      setMailContent('')
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : t('user.messages.send_mail.failed', { defaultValue: '邮件发送失败' }),
      )
    } finally {
      setMailSending(false)
    }
  }

  async function batchBan() {
    setBanning(true)
    try {
      await postJson('/user/ban', buildBulkBody())
      toast.success(t('user.messages.batch_ban.success', { defaultValue: '批量封禁成功' }))
      setBanOpen(false)
      setSelectedIds(new Set())
      load()
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : t('user.messages.batch_ban.failed', { defaultValue: '批量封禁失败' }),
      )
    } finally {
      setBanning(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm({
      email_suffix: '',
      email_prefix: '',
      password: '',
      generate_count: undefined,
      expired_at: null,
      plan_id: null,
    })
    setDialogMode('create')
  }

  function openEdit(row: UserRow) {
    setEditing(row)
    setForm({
      email: row.email,
      invite_user_email: row.invite_user?.email ?? '',
      plan_id: row.plan_id,
      balance: row.balance,
      commission_balance: row.commission_balance,
      transfer_enable: row.transfer_enable,
      u: row.u,
      d: row.d,
      expired_at: row.expired_at,
      banned: Boolean(row.banned),
      commission_rate: row.commission_rate,
      commission_type: row.commission_type ?? 0,
      discount: row.discount,
      speed_limit: row.speed_limit,
      device_limit: row.device_limit,
      is_admin: Boolean(row.is_admin),
      is_staff: Boolean(row.is_staff),
      remarks: row.remarks ?? '',
    })
    setDialogMode('edit')
  }

  async function copySubscribeUrl(row: UserRow) {
    const url = row.subscribe_url
    if (!url) {
      toast.error(t('common.error'))
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success(t('common.success'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  async function resetTrafficForUser() {
    if (!trafficResetUser?.id) return
    setTrafficResetting(true)
    try {
      await postJson('/traffic-reset/reset-user', {
        user_id: trafficResetUser.id,
        reason: trafficResetReason.trim() || undefined,
      })
      toast.success(t('user.traffic_reset.reset_success', { defaultValue: '流量重置成功' }))
      if (trafficResetUser.id) {
        await loadTrafficResetHistory(trafficResetUser.id)
      }
      setTrafficResetReason('')
      load()
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : t('user.traffic_reset.reset_failed', { defaultValue: '流量重置失败' }),
      )
    } finally {
      setTrafficResetting(false)
    }
  }

  async function assignOrder() {
    if (!assignUser?.email) return
    setAssigning(true)
    try {
      const amountYuan = Number(assignForm.total_amount)
      if (!assignForm.plan_id || !assignForm.period || !amountYuan) {
        toast.error(t('common.error'))
        return
      }
      await postJson('/order/assign', {
        email: assignUser.email,
        plan_id: Number(assignForm.plan_id),
        period: assignForm.period,
        total_amount: Math.round(amountYuan * 100),
      })
      toast.success(t('common.success'))
      setAssignUser(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setAssigning(false)
    }
  }

  async function saveUser() {
    setSaving(true)
    try {
      if (dialogMode === 'create') {
        await postJson('/user/generate', form)
      } else {
        const payload: Record<string, unknown> = {
          ...form,
          id: editing?.id,
        }
        if (payload.invite_user_email === '') delete payload.invite_user_email
        await postJson('/user/update', payload)
      }
      toast.success(t('common.success'))
      setDialogMode(null)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteUser(row: UserRow) {
    if (
      !(await confirm(
        t('user.columns.actions_menu.delete_confirm_title', { defaultValue: '确认删除用户' }),
        t('user.columns.actions_menu.delete_confirm_description', {
          email: row.email,
          defaultValue: `此操作将永久删除用户 ${row.email} 及其所有相关数据，删除后无法恢复，是否继续？`,
        }),
      ))
    )
      return
    try {
      await postJson('/user/destroy', { id: row.id })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function resetSecret(row: UserRow) {
    try {
      await postJson('/user/resetSecret', { id: row.id })
      toast.success(t('common.success'))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const pageIds = data.map((r) => r.id).filter((id): id is number => id != null)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))

  const sortHeader = (columnId: string, label: string) => {
    const sort = sorts.find((s) => s.id === columnId)
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() => toggleSort(columnId)}
      >
        {label}
        <ArrowUpDown className={`h-3.5 w-3.5 ${sort ? 'text-primary' : 'opacity-50'}`} />
        {sort ? (
          <span className="sr-only">{sort.desc ? 'desc' : 'asc'}</span>
        ) : null}
      </button>
    )
  }

  const columns = useMemo<ColumnDef<UserRow, unknown>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={allPageSelected}
            onChange={togglePageAll}
            aria-label="select all"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={row.original.id != null && selectedIds.has(row.original.id)}
            onChange={() => toggleRow(row.original.id)}
            aria-label="select row"
          />
        ),
      },
      {
        accessorKey: 'id',
        header: () => sortHeader('id', t('user.columns.id')),
      },
      {
        accessorKey: 'email',
        header: () => sortHeader('email', t('user.columns.email')),
      },
      {
        accessorKey: 'plan_id',
        header: () => t('user.columns.subscription'),
        cell: ({ row }) => {
          const plan = plans.find((p) => p.id === row.original.plan_id)
          return plan?.name ?? row.original.plan_id ?? '—'
        },
      },
      {
        accessorKey: 'balance',
        header: () => sortHeader('balance', t('user.columns.balance')),
      },
      {
        accessorKey: 'expired_at',
        header: () => sortHeader('expired_at', t('user.columns.expire_time')),
        cell: ({ row }) => formatTs(row.original.expired_at),
      },
      {
        accessorKey: 'created_at',
        header: () => sortHeader('created_at', t('user.columns.register_time')),
        cell: ({ row }) => formatTs(row.original.created_at),
      },
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
                {t('user.columns.actions_menu.edit', { defaultValue: '编辑' })}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setAssignUser(row.original)
                  setAssignForm({ plan_id: String(row.original.plan_id ?? ''), period: 'month_price', total_amount: '' })
                }}
              >
                {t('user.columns.actions_menu.assign_order', { defaultValue: '分配订单' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copySubscribeUrl(row.original)}>
                {t('user.columns.actions_menu.copy_url', { defaultValue: '复制订阅URL' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => resetSecret(row.original)}>
                {t('user.columns.actions_menu.reset_secret', { defaultValue: '重置UUID及订阅URL' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openTrafficReset(row.original, 'reset')}>
                {t('user.columns.actions_menu.reset_traffic', { defaultValue: '重置流量' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openTrafficReset(row.original, 'history')}>
                {t('user.traffic_reset.tabs.history', { defaultValue: '重置历史' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/finance/order?user_id=${row.original.id ?? ''}`)}>
                {t('user.columns.actions_menu.orders', { defaultValue: 'TA的订单' })}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => deleteUser(row.original)}>
                {t('user.columns.actions_menu.delete', { defaultValue: '删除' })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, plans, selectedIds, allPageSelected, sorts],
  )

  const trafficResetHistoryColumns = useMemo<ColumnDef<TrafficResetHistoryRow, unknown>[]>(
    () => [
      {
        accessorKey: 'reset_time',
        header: () =>
          t('user.traffic_reset.history.reset_time', { defaultValue: '重置时间' }),
        cell: ({ row }) => formatDateTime(row.original.reset_time),
      },
      {
        accessorKey: 'reset_type_name',
        header: () =>
          t('user.traffic_reset_logs.columns.reset_type', { defaultValue: '重置类型' }),
        cell: ({ row }) => row.original.reset_type_name ?? row.original.reset_type ?? '—',
      },
      {
        accessorKey: 'trigger_source_name',
        header: () =>
          t('user.traffic_reset_logs.columns.trigger_source', { defaultValue: '触发源' }),
        cell: ({ row }) => row.original.trigger_source_name ?? row.original.trigger_source ?? '—',
      },
      {
        id: 'cleared_traffic',
        header: () =>
          t('user.traffic_reset.history.traffic_cleared', { defaultValue: '清除流量' }),
        cell: ({ row }) => row.original.old_traffic?.formatted ?? '—',
      },
    ],
    [t],
  )

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const banScope =
    selectedIds.size > 0 ? 'selected' : filters.length > 0 ? 'filtered' : 'all'

  return (
    <div>
      <div className="mb-2">
        <h2 className="m-0 text-2xl font-bold tracking-tight">{t('user.manage.title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('user.manage.description')}</p>
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
              <span>{t('user.generate.button')}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                  {t('user.actions.title', { defaultValue: '操作' })}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setMailOpen(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  {t('user.actions.send_email', { defaultValue: '发送邮件' })}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportCsv} disabled={exporting}>
                  {t('user.actions.export_csv', { defaultValue: '导出 CSV' })}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBanOpen(true)}>
                  <ShieldBan className="mr-2 h-4 w-4" />
                  {t('user.actions.batch_ban', { defaultValue: '批量封禁' })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="h-8 gap-1 px-3 text-xs" onClick={openAdvanced}>
              <Filter className="h-4 w-4" />
              {t('user.filter.advanced', { defaultValue: '高级筛选' })}
              {advancedConditions.length > 0 ? ` (${advancedConditions.length})` : ''}
            </Button>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t('user.filter.email_search')}
              className={`h-8 min-w-[150px] flex-1 sm:w-[200px] lg:w-[280px] ${inputCls}`}
            />
            <Button variant="outline" size="sm" className="h-8" onClick={() => load()}>
              {t('common.search')}
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            pageSize={pageSize}
            alwaysShowPagination
            totalItems={total}
            pageIndex={page - 1}
            pageCount={pageCount}
            onPageIndexChange={(idx) => setPage(idx + 1)}
          />
        </div>
      </div>

      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('user.filter.sheet.title', { defaultValue: '高级筛选' })}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            {draftConditions.map((cond, idx) => (
              <div key={cond.id} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  className={inputCls}
                  value={cond.field}
                  onChange={(e) => {
                    const next = [...draftConditions]
                    next[idx] = { ...cond, field: e.target.value }
                    setDraftConditions(next)
                  }}
                >
                  {FILTER_FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {t(`user.filter.fields.${f}`, { defaultValue: f })}
                    </option>
                  ))}
                </select>
                <select
                  className={inputCls}
                  value={cond.operator}
                  onChange={(e) => {
                    const next = [...draftConditions]
                    next[idx] = {
                      ...cond,
                      operator: e.target.value as FilterCondition['operator'],
                    }
                    setDraftConditions(next)
                  }}
                >
                  <option value="contains">
                    {t('user.filter.operators.contains', { defaultValue: '包含' })}
                  </option>
                  <option value="eq">{t('user.filter.operators.eq', { defaultValue: '等于' })}</option>
                  <option value="gt">{t('user.filter.operators.gt', { defaultValue: '大于' })}</option>
                  <option value="lt">{t('user.filter.operators.lt', { defaultValue: '小于' })}</option>
                </select>
                <Input
                  value={cond.value}
                  onChange={(e) => {
                    const next = [...draftConditions]
                    next[idx] = { ...cond, value: e.target.value }
                    setDraftConditions(next)
                  }}
                  placeholder={t('user.filter.sheet.value', { defaultValue: '输入值' })}
                  className={inputCls}
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDraftConditions((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    field: 'email',
                    operator: 'contains',
                    value: '',
                  },
                ])
              }
            >
              {t('user.filter.sheet.add', { defaultValue: '添加条件' })}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={clearAdvanced}>
              {t('user.filter.reset', { defaultValue: '重置筛选' })}
            </Button>
            <Button variant="outline" onClick={() => setAdvancedOpen(false)}>
              {t('common.cancel', { defaultValue: '取消' })}
            </Button>
            <Button onClick={applyAdvanced}>
              {t('user.filter.sheet.apply', { defaultValue: '应用筛选' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mailOpen} onOpenChange={setMailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('user.send_mail.title', { defaultValue: '发送邮件' })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('user.send_mail.description', { defaultValue: '向所选或已筛选的用户发送邮件' })}
          </p>
          <div className="flex flex-col gap-4 py-2">
                  <div className="space-y-2">
              <Label>{t('user.send_mail.subject', { defaultValue: '主题' })}</Label>
              <Input
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                className={inputCls}
              />
            </div>
                  <div className="space-y-2">
              <Label>{t('user.send_mail.content', { defaultValue: '内容' })}</Label>
              <textarea
                className={textareaCls}
                value={mailContent}
                onChange={(e) => setMailContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMailOpen(false)}>
              {t('common.cancel', { defaultValue: '取消' })}
            </Button>
            <Button onClick={sendMail} disabled={mailSending}>
              {mailSending
                ? t('user.send_mail.sending', { defaultValue: '发送中...' })
                : t('user.send_mail.send', { defaultValue: '发送' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('user.actions.confirm_ban.title', { defaultValue: '确认批量封禁' })}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {banScope === 'selected'
              ? t('user.filter.selected', {
                  count: selectedIds.size,
                  defaultValue: `此操作将封禁已选择的 ${selectedIds.size} 个用户。此操作无法撤销。`,
                })
              : banScope === 'filtered'
                ? t('user.actions.confirm_ban.filtered_description', {
                    defaultValue: '此操作将封禁所有符合当前筛选条件的用户。此操作无法撤销。',
                  })
                : t('user.actions.confirm_ban.all_description', {
                    defaultValue: '此操作将封禁系统中的所有用户。此操作无法撤销。',
                  })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanOpen(false)}>
              {t('user.actions.confirm_ban.cancel', { defaultValue: '取消' })}
            </Button>
            <Button variant="destructive" onClick={batchBan} disabled={banning}>
              {banning
                ? t('user.actions.confirm_ban.banning', { defaultValue: '封禁中...' })
                : t('user.actions.confirm_ban.confirm', { defaultValue: '确认封禁' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogMode === 'create'}
        onOpenChange={(o) => !o && setDialogMode(null)}
      >
        <DialogContent className="sm:max-w-[576px]">
          <DialogHeader>
            <DialogTitle>{t('user.generate.title', { defaultValue: '创建用户' })}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="space-y-2">
              <Label>{t('user.generate.form.email')}</Label>
              <div className="flex w-full items-center">
                {!form.generate_count ? (
                  <input
                    className={`${inputCls} min-w-0 flex-[5] rounded-r-none border-r-0`}
                    placeholder={t('user.generate.form.email_prefix')}
                    value={String(form.email_prefix ?? '')}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email_prefix: e.target.value }))
                    }
                  />
                ) : null}
                <div
                  className={`flex h-9 shrink-0 items-center border-y border-input bg-muted/30 px-3 font-mono text-xs text-muted-foreground ${
                    form.generate_count ? 'rounded-l-md border-l' : 'border-l-0'
                  }`}
                >
                  @
                </div>
                <input
                  className={`${inputCls} min-w-0 flex-[4] rounded-l-none border-l-0`}
                  placeholder={t('user.generate.form.email_domain')}
                  value={String(form.email_suffix ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, email_suffix: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('user.generate.form.password')}</Label>
              <input
                className={inputCls}
                type="password"
                placeholder={t('user.generate.form.password_placeholder')}
                value={String(form.password ?? '')}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('user.generate.form.expire_time')}</Label>
                <ExpireDateInput
                  value={form.expired_at as number | null | undefined}
                  onChange={(ts) => setForm((f) => ({ ...f, expired_at: ts }))}
                  placeholder={t('user.generate.form.expire_time_placeholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('user.generate.form.subscription')}</Label>
                <FormSelect
                  value={String(form.plan_id ?? '')}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      plan_id: v ? Number(v) : null,
                    }))
                  }
                  options={[
                    {
                      value: '',
                      label: t('user.generate.form.subscription_none', { defaultValue: '无' }),
                    },
                    ...plans.map((p) => ({ value: String(p.id), label: String(p.name) })),
                  ]}
                />
              </div>
            </div>
            {!form.email_prefix ? (
              <div className="space-y-2">
                <Label>{t('user.generate.form.generate_count')}</Label>
                <input
                  type="number"
                  className={inputCls}
                  placeholder={t('user.generate.form.generate_count_placeholder')}
                  value={form.generate_count != null ? Number(form.generate_count) : ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      generate_count: e.target.value === '' ? undefined : Number(e.target.value),
                    }))
                  }
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              {t('user.generate.form.cancel', { defaultValue: '取消' })}
            </Button>
            <Button onClick={saveUser} disabled={saving}>
              {t('user.generate.form.submit', { defaultValue: '生成' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={dialogMode === 'edit'} onOpenChange={(o) => !o && setDialogMode(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-scroll p-6 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t('user.manage.title', { defaultValue: '用户管理' })}</SheetTitle>
          </SheetHeader>
                <div className="space-y-2">
                  <Label>{t('user.edit.form.email')}</Label>
                  <input
                    className={inputCls}
                    value={String(form.email ?? '')}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('user.edit.form.inviter_email')}</Label>
                  <input
                    className={inputCls}
                    value={String(form.invite_user_email ?? '')}
                    onChange={(e) => setForm((f) => ({ ...f, invite_user_email: e.target.value }))}
                    placeholder={t('user.edit.form.inviter_email_placeholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('user.edit.form.password')}</Label>
                  <input
                    className={inputCls}
                    type="password"
                    placeholder={t('user.edit.form.password_placeholder', { defaultValue: '如需修改密码请输入' })}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value || undefined }))}
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('user.edit.form.balance')}</Label>
                    <SuffixInput
                      suffix="¥"
                      type="number"
                      value={Number(form.balance ?? 0)}
                      onChange={(e) => setForm((f) => ({ ...f, balance: Number(e.target.value) }))}
                      placeholder={t('user.edit.form.balance_placeholder', { defaultValue: '请输入余额' })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('user.edit.form.commission_balance')}</Label>
                    <SuffixInput
                      suffix="¥"
                      type="number"
                      value={Number(form.commission_balance ?? 0)}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, commission_balance: Number(e.target.value) }))
                      }
                      placeholder={t('user.edit.form.commission_balance_placeholder', {
                        defaultValue: '请输入佣金余额',
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('user.edit.form.upload')}</Label>
                    <SuffixInput
                      suffix="GB"
                      type="number"
                      value={Number(form.u ?? 0)}
                      onChange={(e) => setForm((f) => ({ ...f, u: Number(e.target.value) }))}
                      placeholder={t('user.edit.form.upload_placeholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('user.edit.form.download')}</Label>
                    <SuffixInput
                      suffix="GB"
                      type="number"
                      value={Number(form.d ?? 0)}
                      onChange={(e) => setForm((f) => ({ ...f, d: Number(e.target.value) }))}
                      placeholder={t('user.edit.form.download_placeholder')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('user.edit.form.total_traffic')}</Label>
                  <SuffixInput
                    suffix="GB"
                    type="number"
                    value={Number(form.transfer_enable ?? 0)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, transfer_enable: Number(e.target.value) }))
                    }
                    placeholder={t('user.edit.form.total_traffic_placeholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('user.edit.form.expire_time')}</Label>
                  <ExpireDateInput
                    value={form.expired_at as number | null | undefined}
                    onChange={(ts) => setForm((f) => ({ ...f, expired_at: ts }))}
                    placeholder={t('user.edit.form.expire_time_placeholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('user.edit.form.subscription')}</Label>
                  <FormSelect
                    value={String(form.plan_id ?? '')}
                    onChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        plan_id: v ? Number(v) : null,
                      }))
                    }
                    options={[
                      { value: '', label: t('user.edit.form.subscription_none', { defaultValue: '无' }) },
                      ...plans.map((p) => ({ value: String(p.id), label: String(p.name) })),
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('user.edit.form.account_status')}</Label>
                  <FormSelect
                    value={form.banned ? 'banned' : 'normal'}
                    onChange={(v) => setForm((f) => ({ ...f, banned: v === 'banned' }))}
                    options={[
                      { value: 'normal', label: t('user.columns.status_text.normal', { defaultValue: '正常' }) },
                      { value: 'banned', label: t('user.columns.status_text.banned', { defaultValue: '封禁' }) },
                    ]}
                  />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('user.edit.form.commission_type')}</Label>
                    <FormSelect
                      value={String(form.commission_type ?? 0)}
                      onChange={(v) => setForm((f) => ({ ...f, commission_type: Number(v) }))}
                      options={[
                        { value: '0', label: t('user.edit.form.commission_type_system') },
                        { value: '1', label: t('user.edit.form.commission_type_cycle') },
                        { value: '2', label: t('user.edit.form.commission_type_onetime') },
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('user.edit.form.commission_rate')}</Label>
                    <input
                      type="number"
                      className={inputCls}
                      value={form.commission_rate != null ? Number(form.commission_rate) : ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          commission_rate: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                      placeholder={t('user.edit.form.commission_rate_placeholder')}
                    />
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('user.edit.form.discount')}</Label>
                    <input
                      type="number"
                      className={inputCls}
                      value={form.discount != null ? Number(form.discount) : ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          discount: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                      placeholder={t('user.edit.form.discount_placeholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('user.edit.form.speed_limit')}</Label>
                    <input
                      type="number"
                      className={inputCls}
                      value={form.speed_limit != null ? Number(form.speed_limit) : ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          speed_limit: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                      placeholder={t('user.edit.form.speed_limit_placeholder')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('user.edit.form.device_limit')}</Label>
                  <input
                    type="number"
                    className={inputCls}
                    value={form.device_limit != null ? Number(form.device_limit) : ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        device_limit: e.target.value === '' ? null : Number(e.target.value),
                      }))
                    }
                    placeholder={t('user.edit.form.device_limit_placeholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('user.edit.form.remarks')}</Label>
                  <textarea
                    className={`${textareaCls} min-h-[96px]`}
                    value={String(form.remarks ?? '')}
                    onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                    placeholder={t('user.edit.form.remarks_placeholder')}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={Boolean(form.is_admin)}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, is_admin: v }))}
                    />
                    <Label>{t('user.edit.form.is_admin')}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={Boolean(form.is_staff)}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, is_staff: v }))}
                    />
                    <Label>{t('user.edit.form.is_staff')}</Label>
                  </div>
                </div>
          <SheetFooter className="mt-0 flex-row justify-end gap-2 border-0 p-0 pt-0">
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              {t('user.edit.form.cancel', { defaultValue: '取消' })}
            </Button>
            <Button onClick={saveUser} disabled={saving}>
              {t('user.edit.form.submit', { defaultValue: '提交' })}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={trafficResetUser !== null} onOpenChange={(o) => !o && closeTrafficReset()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('user.traffic_reset.title', { defaultValue: '流量重置' })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('user.traffic_reset.description', {
              email: trafficResetUser?.email ?? '',
              defaultValue: `为用户 ${trafficResetUser?.email ?? ''} 重置流量使用量`,
            })}
          </p>
          <Tabs
            value={trafficResetTab}
            onValueChange={(v) => setTrafficResetTab(v as 'reset' | 'history')}
          >
            <TabsList className="grid h-9 w-full grid-cols-2">
              <TabsTrigger value="reset">
                {t('user.traffic_reset.tabs.reset', { defaultValue: '重置流量' })}
              </TabsTrigger>
              <TabsTrigger value="history">
                {t('user.traffic_reset.tabs.history', { defaultValue: '重置历史' })}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="reset" className="mt-4 space-y-4">
              <textarea
                className={textareaCls}
                value={trafficResetReason}
                onChange={(e) => setTrafficResetReason(e.target.value)}
                placeholder={t('user.traffic_reset.reason.placeholder', {
                  defaultValue: '请输入重置流量的原因（可选）',
                })}
              />
              <DialogFooter className="gap-2 sm:justify-end">
                <Button variant="outline" onClick={closeTrafficReset}>
                  {t('common.cancel', { defaultValue: '取消' })}
                </Button>
                <Button onClick={resetTrafficForUser} disabled={trafficResetting}>
                  {trafficResetting
                    ? t('user.traffic_reset.resetting', { defaultValue: '重置中...' })
                    : t('user.traffic_reset.confirm_reset', { defaultValue: '确认重置' })}
                </Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="history" className="mt-4 space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('user.traffic_reset.history.reset_count', { defaultValue: '重置次数' })}
                  </p>
                  <p className="text-sm font-medium">
                    {trafficResetHistory?.user?.reset_count ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('user.traffic_reset.history.last_reset', { defaultValue: '最后重置' })}
                  </p>
                  <p className="text-sm font-medium">
                    {trafficResetHistory?.user?.last_reset_at
                      ? formatTs(trafficResetHistory.user.last_reset_at)
                      : t('user.traffic_reset.history.never', { defaultValue: '从未重置' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('user.traffic_reset.history.next_reset', { defaultValue: '下次重置' })}
                  </p>
                  <p className="text-sm font-medium">
                    {trafficResetHistory?.user?.next_reset_at
                      ? formatTs(trafficResetHistory.user.next_reset_at)
                      : t('user.traffic_reset.history.no_schedule', { defaultValue: '无定时重置' })}
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">
                  {t('user.traffic_reset.history.recent_records', {
                    defaultValue: '最近10次重置记录',
                  })}
                </p>
                {!trafficResetHistoryLoading &&
                (trafficResetHistory?.history?.length ?? 0) === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {t('user.traffic_reset.history.no_records', { defaultValue: '暂无重置记录' })}
                  </p>
                ) : (
                  <DataTable
                    columns={trafficResetHistoryColumns}
                    data={trafficResetHistory?.history ?? []}
                    loading={trafficResetHistoryLoading}
                  />
                )}
              </div>
              <DialogFooter className="gap-2 sm:justify-end">
                <Button variant="outline" onClick={closeTrafficReset}>
                  {t('common.close', { defaultValue: '关闭' })}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={assignUser !== null} onOpenChange={(o) => !o && setAssignUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('user.columns.actions_menu.assign_order', { defaultValue: '分配订单' })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{assignUser?.email}</p>
          <div className="flex flex-col gap-4 py-2">
                  <div className="space-y-2">
              <Label>{t('user.edit.form.subscription')}</Label>
              <select
                className={inputCls}
                value={assignForm.plan_id}
                onChange={(e) => setAssignForm((f) => ({ ...f, plan_id: e.target.value }))}
              >
                <option value="">{t('common.none', { defaultValue: '无' })}</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
                  <div className="space-y-2">
              <Label>{t('order.form.period', { defaultValue: '周期' })}</Label>
              <select
                className={inputCls}
                value={assignForm.period}
                onChange={(e) => setAssignForm((f) => ({ ...f, period: e.target.value }))}
              >
                {ORDER_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </div>
                  <div className="space-y-2">
              <Label>{t('order.form.total_amount', { defaultValue: '金额（元）' })}</Label>
              <input
                type="number"
                className={inputCls}
                value={assignForm.total_amount}
                onChange={(e) => setAssignForm((f) => ({ ...f, total_amount: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignUser(null)}>
              {t('common.cancel', { defaultValue: '取消' })}
            </Button>
            <Button onClick={assignOrder} disabled={assigning}>
              {t('common.confirm', { defaultValue: '确定' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  )
}
