import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, VisibilityState } from '@tanstack/react-table'
import { IconDots } from '@tabler/icons-react'
import { ArrowUpDown, Filter, Mail, Plus, Send, ShieldBan, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/api-errors'
import {
  adminApi,
  downloadAdminFile,
  fetchJsonList,
  fetchJsonObject,
  postJson,
  type PaginatedResult,
} from '@/lib/api'
import {
  dialogCompactInputCls,
  dialogFieldInputCls,
  dialogFieldLabelCls,
  dialogMailInputCls,
  dialogMailTextareaCls,
  editSheetFieldCls,
  editSheetExpireBtnCls,
  editSheetExpireFieldCls,
  editSheetRemarksFieldCls,
  editSheetSelectCls,
  editSheetSwitchFieldCls,
  editSheetSwitchWrapCls,
  sheetFieldLabelCls,
  dialogInputCls,
  dialogSelectCls,
  inputCls,
  textareaCls,
} from '@/lib/form-styles'
import { cn } from '@/lib/utils'
import { getAdminCurrencySymbol, formatAdminMoneyFromMajor, loadAdminCurrency } from '@/lib/currency'
import { formatAdminDateTime, formatAdminDateTimeValue } from '@/lib/format-datetime'
import { DataTable } from '@/components/shared/DataTable'
import { DialogFormFooter } from '@/components/shared/DialogFormFooter'
import { ExpireDateInput } from '@/components/shared/ExpireDateInput'
import { FormSelect } from '@/components/shared/FormSelect'
import { SuffixInput } from '@/components/shared/SuffixInput'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { UserInvitesSheet } from '@/pages/modules/UserInvitesSheet'
import { UserTrafficRecordsDialog } from '@/pages/modules/UserTrafficRecordsDialog'

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
  total_used?: number
  online_count?: number
  next_reset_at?: number | null
  group?: { id?: number; name?: string }
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
  'remarks',
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

const USER_TABLE_COLUMN_VISIBILITY_KEY = 'xboard_admin_user_table_columns'

const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  is_admin: false,
  is_staff: false,
  used_traffic: false,
  total_traffic: false,
  commission: false,
  status: false,
  group: false,
  online_count: false,
  next_reset_at: false,
}

const TOGGLEABLE_COLUMNS = [
  { id: 'id', labelKey: 'user.columns.id' },
  { id: 'email', labelKey: 'user.columns.email' },
  { id: 'is_admin', labelKey: 'user.columns.is_admin' },
  { id: 'is_staff', labelKey: 'user.columns.is_staff' },
  { id: 'online_count', labelKey: 'user.columns.online_count' },
  { id: 'status', labelKey: 'user.columns.status' },
  { id: 'plan_id', labelKey: 'user.columns.subscription' },
  { id: 'group', labelKey: 'user.columns.group' },
  { id: 'used_traffic', labelKey: 'user.columns.used_traffic' },
  { id: 'total_traffic', labelKey: 'user.columns.total_traffic' },
  { id: 'expired_at', labelKey: 'user.columns.expire_time' },
  { id: 'balance', labelKey: 'user.columns.balance' },
  { id: 'commission', labelKey: 'user.columns.commission' },
  { id: 'created_at', labelKey: 'user.columns.register_time' },
  { id: 'next_reset_at', labelKey: 'user.columns.next_reset_at' },
] as const

function loadColumnVisibility(): VisibilityState {
  try {
    const raw = localStorage.getItem(USER_TABLE_COLUMN_VISIBILITY_KEY)
    if (!raw) return DEFAULT_COLUMN_VISIBILITY
    const saved = JSON.parse(raw) as VisibilityState
    return { ...DEFAULT_COLUMN_VISIBILITY, ...saved }
  } catch {
    return DEFAULT_COLUMN_VISIBILITY
  }
}

const TRAFFIC_GB = 1024 * 1024 * 1024

function formatBytes(n?: number | null) {
  if (!n) return '0 B'
  const gb = n / TRAFFIC_GB
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  const mb = n / 1048576
  if (mb >= 1) return `${mb.toFixed(2)} MB`
  const kb = n / 1024
  if (kb >= 1) return `${kb.toFixed(2)} KB`
  return `${n} B`
}

function bytesToTrafficGb(bytes?: number | null) {
  if (!bytes) return ''
  return (bytes / TRAFFIC_GB).toFixed(3)
}

function trafficGbToBytes(gb: number | string) {
  const n = typeof gb === 'string' ? parseFloat(gb) : gb
  if (!n || Number.isNaN(n)) return 0
  return Math.round(TRAFFIC_GB * n)
}

const GB_FILTER_FIELDS = new Set(['transfer_enable', 'total_used'])
const MONEY_FILTER_FIELDS = new Set(['balance', 'commission_balance'])

function filterValueForApi(cond: FilterCondition): string | number {
  const raw = cond.value.trim()
  if (!raw) return ''
  if (cond.operator === 'contains') return raw
  let numeric = raw
  if (GB_FILTER_FIELDS.has(cond.field)) {
    const gb = parseFloat(raw)
    if (!Number.isNaN(gb)) {
      numeric = String(Math.round(gb * 1024 * 1024 * 1024))
    }
  } else if (MONEY_FILTER_FIELDS.has(cond.field)) {
    const yuan = parseFloat(raw)
    if (!Number.isNaN(yuan)) {
      numeric = String(Math.round(yuan * 100))
    }
  }
  return `${cond.operator}:${numeric}`
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
  const [mailScope, setMailScope] = useState<'selected' | 'filtered' | 'all'>('all')
  const [mailSending, setMailSending] = useState(false)

  const [banOpen, setBanOpen] = useState(false)
  const [banning, setBanning] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportIncludeSubscribe, setExportIncludeSubscribe] = useState(false)
  const [currencySymbol, setCurrencySymbol] = useState('¥')

  const [trafficResetUser, setTrafficResetUser] = useState<UserRow | null>(null)
  const [trafficResetTab, setTrafficResetTab] = useState<'reset' | 'history'>('reset')
  const [trafficResetReason, setTrafficResetReason] = useState('')
  const [trafficResetting, setTrafficResetting] = useState(false)
  const [trafficResetHistory, setTrafficResetHistory] = useState<TrafficResetHistoryData | null>(
    null,
  )
  const [trafficResetHistoryLoading, setTrafficResetHistoryLoading] = useState(false)

  const [invitesUser, setInvitesUser] = useState<UserRow | null>(null)
  const [trafficRecordsUser, setTrafficRecordsUser] = useState<UserRow | null>(null)

  const [assignUser, setAssignUser] = useState<UserRow | null>(null)
  const [assignForm, setAssignForm] = useState({
    plan_id: '',
    period: 'month_price',
    total_amount: '',
  })
  const [assigning, setAssigning] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(loadColumnVisibility)

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
      .catch((e) => toastApiError(e, toast, t, t('common.error')))
      .finally(() => setLoading(false))
  }, [page, pageSize, filters, sorts, t])

  useEffect(() => {
    fetchJsonList('/plan/fetch')
      .then((rows) => setPlans(rows as PlanRow[]))
      .catch((e) => toastApiError(e, toast, t, t('common.error')))
  }, [])

  useEffect(() => {
    void loadAdminCurrency().then(() => setCurrencySymbol(getAdminCurrencySymbol()))
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
        toastApiError(e, toast, t, t('common.error'))
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
        {
          method: 'POST',
          jsonBody: {
            ...buildBulkBody(),
            include_subscribe_url: exportIncludeSubscribe,
          },
        },
        'users.csv',
      )
      toast.success(t('user.messages.export.success'))
      setExportOpen(false)
      setExportIncludeSubscribe(false)
    } catch (e) {
      toastApiError(e, toast, t, t('user.messages.export.failed'))
    } finally {
      setExporting(false)
    }
  }

  async function sendMail() {
    if (!mailSubject.trim() || !mailContent.trim()) {
      toast.error(
        t('user.messages.send_mail.required_fields'),
      )
      return
    }
    setMailSending(true)
    try {
      const subject = mailSubject.trim()
      const content = mailContent.trim()
      if (mailScope === 'selected') {
        if (selectedIds.size === 0) {
          toast.error(t('user.messages.send_mail.required_selected'))
          return
        }
        await postJson('/user/sendMail', {
          scope: 'selected',
          user_ids: Array.from(selectedIds),
          subject,
          content,
        })
      } else if (mailScope === 'filtered') {
        if (filters.length === 0) {
          toast.error(t('user.messages.send_mail.required_filtered'))
          return
        }
        await postJson('/user/sendMail', {
          scope: 'filtered',
          filter: filters,
          ...(sorts[0]
            ? { sort: sorts[0].id, sort_type: sorts[0].desc ? 'DESC' : 'ASC' }
            : {}),
          subject,
          content,
        })
      } else {
        await postJson('/user/sendMail', { scope: 'all', subject, content })
      }
      toast.success(t('user.messages.send_mail.success'))
      setMailOpen(false)
      setMailSubject('')
      setMailContent('')
    } catch (e) {
      toastApiError(e, toast, t, t('user.messages.send_mail.failed'))
    } finally {
      setMailSending(false)
    }
  }

  async function batchBan() {
    const body = buildBulkBody()
    if (body.scope === 'all') {
      toast.error(t('user.messages.batch_ban.required_scope'))
      return
    }
    if (body.scope === 'selected' && selectedIds.size === 0) {
      toast.error(t('user.messages.send_mail.required_selected'))
      return
    }
    if (body.scope === 'filtered' && filters.length === 0) {
      toast.error(t('user.messages.send_mail.required_filtered'))
      return
    }
    setBanning(true)
    try {
      await postJson('/user/ban', body)
      toast.success(t('user.messages.batch_ban.success'))
      setBanOpen(false)
      setSelectedIds(new Set())
      load()
    } catch (e) {
      toastApiError(e, toast, t, t('user.messages.batch_ban.failed'))
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
      transfer_enable: row.transfer_enable ? row.transfer_enable / TRAFFIC_GB : 0,
      u: row.u ? bytesToTrafficGb(row.u) : '',
      d: row.d ? bytesToTrafficGb(row.d) : '',
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
      toast.success(t('user.traffic_reset.reset_success'))
      if (trafficResetUser.id) {
        await loadTrafficResetHistory(trafficResetUser.id)
      }
      setTrafficResetReason('')
      load()
    } catch (e) {
      toastApiError(e, toast, t, t('user.traffic_reset.reset_failed'))
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
      toastApiError(e, toast, t, t('common.error'))
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
        if (payload.u !== undefined && payload.u !== '') {
          payload.u = trafficGbToBytes(payload.u as number | string)
        }
        if (payload.d !== undefined && payload.d !== '') {
          payload.d = trafficGbToBytes(payload.d as number | string)
        }
        if (payload.transfer_enable !== undefined) {
          payload.transfer_enable = trafficGbToBytes(payload.transfer_enable as number | string)
        }
        await postJson('/user/update', payload)
      }
      toast.success(t('common.success'))
      setDialogMode(null)
      load()
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteUser(row: UserRow) {
    if (
      !(await confirm(
        t('user.columns.actions_menu.delete_confirm_title'),
        t('user.columns.actions_menu.delete_confirm_description', { email: row.email }),
      ))
    )
      return
    try {
      await postJson('/user/destroy', { id: row.id })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    }
  }

  async function resetSecret(row: UserRow) {
    try {
      await postJson('/user/resetSecret', { id: row.id })
      toast.success(t('common.success'))
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    }
  }

  const pageIds = data.map((r) => r.id).filter((id): id is number => id != null)
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id))

  function handleColumnVisibilityChange(
    updater: VisibilityState | ((prev: VisibilityState) => VisibilityState),
  ) {
    setColumnVisibility((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem(USER_TABLE_COLUMN_VISIBILITY_KEY, JSON.stringify(next))
      return next
    })
  }

  function toggleColumnVisibility(columnId: string) {
    handleColumnVisibilityChange((prev) => {
      const visible = prev[columnId] !== false
      return { ...prev, [columnId]: !visible }
    })
  }

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
          <span className="sr-only">{sort.desc ? t('common.table.sortDesc') : t('common.table.sortAsc')}</span>
        ) : null}
      </button>
    )
  }

  const columns = useMemo<ColumnDef<UserRow, unknown>[]>(
    () => [
      {
        id: 'select',
        enableHiding: false,
        header: () => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={allPageSelected}
            onChange={togglePageAll}
            aria-label={t('common.table.selectAllAria')}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={row.original.id != null && selectedIds.has(row.original.id)}
            onChange={() => toggleRow(row.original.id)}
            aria-label={t('common.table.selectRowAria')}
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
        id: 'is_admin',
        accessorKey: 'is_admin',
        header: () => t('user.columns.is_admin'),
        cell: ({ row }) => (row.original.is_admin ? '✓' : '—'),
      },
      {
        id: 'is_staff',
        accessorKey: 'is_staff',
        header: () => t('user.columns.is_staff'),
        cell: ({ row }) => (row.original.is_staff ? '✓' : '—'),
      },
      {
        id: 'online_count',
        accessorKey: 'online_count',
        header: () => sortHeader('online_count', t('user.columns.online_count')),
        cell: ({ row }) => row.original.online_count ?? 0,
      },
      {
        id: 'status',
        accessorKey: 'banned',
        header: () => sortHeader('banned', t('user.columns.status')),
        cell: ({ row }) =>
          row.original.banned
            ? t('user.columns.status_text.banned')
            : t('user.columns.status_text.normal'),
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
        id: 'group',
        accessorKey: 'group',
        header: () => t('user.columns.group'),
        cell: ({ row }) => row.original.group?.name ?? '—',
      },
      {
        id: 'used_traffic',
        accessorKey: 'total_used',
        header: () => sortHeader('total_used', t('user.columns.used_traffic')),
        cell: ({ row }) => formatBytes(row.original.total_used),
      },
      {
        id: 'total_traffic',
        accessorKey: 'transfer_enable',
        header: () => sortHeader('transfer_enable', t('user.columns.total_traffic')),
        cell: ({ row }) => formatBytes(row.original.transfer_enable),
      },
      {
        accessorKey: 'balance',
        header: () => sortHeader('balance', t('user.columns.balance')),
        cell: ({ row }) => formatAdminMoneyFromMajor(row.original.balance ?? 0),
      },
      {
        accessorKey: 'expired_at',
        header: () => sortHeader('expired_at', t('user.columns.expire_time')),
        cell: ({ row }) => formatAdminDateTime(row.original.expired_at),
      },
      {
        id: 'commission',
        accessorKey: 'commission_balance',
        header: () => sortHeader('commission_balance', t('user.columns.commission')),
        cell: ({ row }) => formatAdminMoneyFromMajor(row.original.commission_balance ?? 0),
      },
      {
        accessorKey: 'created_at',
        header: () => sortHeader('created_at', t('user.columns.register_time')),
        cell: ({ row }) => formatAdminDateTime(row.original.created_at),
      },
      {
        id: 'next_reset_at',
        accessorKey: 'next_reset_at',
        header: () => sortHeader('next_reset_at', t('user.columns.next_reset_at')),
        cell: ({ row }) => formatAdminDateTime(row.original.next_reset_at),
      },
      {
        id: 'actions',
        enableHiding: false,
        header: () => t('common.table.columns.actions'),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <IconDots className="tabler-icon h-4 w-4" stroke={2} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                {t('user.columns.actions_menu.view_details')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                {t('user.columns.actions_menu.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setAssignUser(row.original)
                  setAssignForm({ plan_id: String(row.original.plan_id ?? ''), period: 'month_price', total_amount: '' })
                }}
              >
                {t('user.columns.actions_menu.assign_order')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copySubscribeUrl(row.original)}>
                {t('user.columns.actions_menu.copy_url')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => resetSecret(row.original)}>
                {t('user.columns.actions_menu.reset_secret')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openTrafficReset(row.original, 'reset')}>
                {t('user.columns.actions_menu.reset_traffic')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openTrafficReset(row.original, 'history')}>
                {t('user.traffic_reset.tabs.history')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/finance/order?user_id=${row.original.id ?? ''}`)}>
                {t('user.columns.actions_menu.orders')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setInvitesUser(row.original)}>
                {t('user.columns.actions_menu.invites')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTrafficRecordsUser(row.original)}>
                {t('user.columns.actions_menu.traffic_records')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => deleteUser(row.original)}>
                {t('user.columns.actions_menu.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, plans, selectedIds, allPageSelected, sorts, data, load],
  )

  const trafficResetHistoryColumns = useMemo<ColumnDef<TrafficResetHistoryRow, unknown>[]>(
    () => [
      {
        accessorKey: 'reset_time',
        header: () =>
          t('user.traffic_reset.history.reset_time'),
        cell: ({ row }) => formatAdminDateTimeValue(row.original.reset_time),
      },
      {
        accessorKey: 'reset_type_name',
        header: () =>
          t('user.traffic_reset_logs.columns.reset_type'),
        cell: ({ row }) => row.original.reset_type_name ?? row.original.reset_type ?? '—',
      },
      {
        accessorKey: 'trigger_source_name',
        header: () =>
          t('user.traffic_reset_logs.columns.trigger_source'),
        cell: ({ row }) => row.original.trigger_source_name ?? row.original.trigger_source ?? '—',
      },
      {
        id: 'cleared_traffic',
        header: () =>
          t('user.traffic_reset.history.traffic_cleared'),
        cell: ({ row }) => row.original.old_traffic?.formatted ?? '—',
      },
    ],
    [t],
  )

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const banScope =
    selectedIds.size > 0 ? 'selected' : filters.length > 0 ? 'filtered' : 'all'
  const defaultMailScope = banScope

  useEffect(() => {
    if (mailOpen) setMailScope(defaultMailScope)
  }, [mailOpen, defaultMailScope])

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
                  {t('user.actions.title')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setMailOpen(true)}>
                  <Mail className="mr-2 h-4 w-4" />
                  {t('user.actions.send_email')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setExportOpen(true)} disabled={exporting}>
                  {t('user.actions.export_csv')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBanOpen(true)}>
                  <ShieldBan className="mr-2 h-4 w-4" />
                  {t('user.actions.batch_ban')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="h-8 gap-1 px-3 text-xs" onClick={openAdvanced}>
              <Filter className="h-4 w-4" />
              {t('user.filter.advanced')}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto hidden h-8 px-3 text-xs lg:flex"
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  {t('common.table.viewOptions.button')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>{t('common.table.viewOptions.label')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {TOGGLEABLE_COLUMNS.map((col) => (
                  <DropdownMenuItem
                    key={col.id}
                    className="gap-2"
                    onSelect={(e) => e.preventDefault()}
                    onClick={() => toggleColumnVisibility(col.id)}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={columnVisibility[col.id] !== false}
                      readOnly
                      aria-hidden
                    />
                    {t(col.labelKey)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={handleColumnVisibilityChange}
          />
        </div>
      </div>

      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('user.filter.sheet.title')}</DialogTitle>
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
                      {t(`user.filter.fields.${f}`)}
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
                    {t('user.filter.operators.contains')}
                  </option>
                  <option value="eq">{t('user.filter.operators.eq')}</option>
                  <option value="gt">{t('user.filter.operators.gt')}</option>
                  <option value="lt">{t('user.filter.operators.lt')}</option>
                </select>
                <Input
                  value={cond.value}
                  onChange={(e) => {
                    const next = [...draftConditions]
                    next[idx] = { ...cond, value: e.target.value }
                    setDraftConditions(next)
                  }}
                  placeholder={t('user.filter.sheet.value')}
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
              {t('user.filter.sheet.add')}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={clearAdvanced}>
              {t('user.filter.reset')}
            </Button>
            <Button variant="outline" onClick={() => setAdvancedOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={applyAdvanced}>
              {t('user.filter.sheet.apply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mailOpen} onOpenChange={setMailOpen}>
        <DialogContent className="!flex h-[764px] max-h-[764px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[672px]">
          <DialogHeader className="box-border flex h-[88px] shrink-0 flex-col justify-center border-b px-6 pb-4 pt-6">
            <DialogTitle>{t('user.send_mail.title')}</DialogTitle>
            <DialogDescription className="text-xs opacity-70">
              {t('user.send_mail.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 px-6 py-4 text-sm">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={dialogFieldLabelCls}>{t('user.send_mail.scope')}</label>
                <Select
                  value={mailScope}
                  onValueChange={(v) => setMailScope(v as 'selected' | 'filtered' | 'all')}
                >
                  <SelectTrigger className={dialogSelectCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="selected" disabled={selectedIds.size === 0}>
                      {t('user.send_mail.scope_selected', { count: selectedIds.size })}
                    </SelectItem>
                    <SelectItem value="filtered" disabled={filters.length === 0}>
                      {t('user.send_mail.scope_filtered')}
                    </SelectItem>
                    <SelectItem value="all">{t('user.send_mail.scope_all')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="mail-subject" className={dialogFieldLabelCls}>
                  {t('user.send_mail.subject')}
                </label>
                <input
                  id="mail-subject"
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  placeholder={t('user.send_mail.subject_placeholder')}
                  className={dialogMailInputCls}
                  disabled={mailSending}
                />
                <p className="font-mono text-[10px] leading-relaxed opacity-70">
                  {t('user.send_mail.subject_placeholder_hint')}
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="mail-content" className={dialogFieldLabelCls}>
                    {t('user.send_mail.content')}
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 font-mono text-[10px]"
                    disabled={mailSending}
                    onClick={() => {
                      setMailSubject(t('user.send_mail.system_notice_subject'))
                      setMailContent(t('user.send_mail.system_notice_content'))
                    }}
                  >
                    {t('user.send_mail.apply_system_notice')}
                  </Button>
                </div>
                <textarea
                  id="mail-content"
                  className={dialogMailTextareaCls}
                  value={mailContent}
                  onChange={(e) => setMailContent(e.target.value)}
                  placeholder={t('user.send_mail.content_placeholder')}
                  disabled={mailSending}
                />
                <p className="font-mono text-[10px] leading-relaxed opacity-70">
                  {t('user.send_mail.content_plain_hint')}
                </p>
              </div>
              <div className="rounded-md border bg-muted/10 p-3">
                <div className={dialogFieldLabelCls}>{t('user.send_mail.available_vars')}</div>
                <div className="mt-2 font-mono text-[10px] leading-relaxed opacity-80">
                  {'{{app.name}} {{app.url}} {{now}} {{user.id}} {{user.email}} {{user.uuid}} {{user.plan_name}} {{user.expired_at}} {{user.transfer_enable}} {{user.transfer_used}} {{user.transfer_left}}'}
                </div>
              </div>
            </div>
            </div>
          </div>
          <DialogFormFooter
            onCancel={() => setMailOpen(false)}
            onSubmit={sendMail}
            cancelLabel={t('common.cancel')}
            submitLabel={mailSending ? t('user.send_mail.sending') : t('user.send_mail.send')}
            submitting={mailSending}
            submitIcon={<Send className="h-4 w-4" />}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('user.actions.export_confirm.title')}</DialogTitle>
            <DialogDescription>{t('user.actions.export_confirm.description')}</DialogDescription>
          </DialogHeader>
          <div className={editSheetSwitchFieldCls} data-mask-switch-row>
            <Label className={sheetFieldLabelCls}>
              {t('user.actions.export_confirm.include_subscribe')}
            </Label>
            <div className={editSheetSwitchWrapCls}>
              <Switch
                checked={exportIncludeSubscribe}
                onCheckedChange={setExportIncludeSubscribe}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={exportCsv} disabled={exporting}>
              {exporting ? t('user.actions.export_confirm.exporting') : t('user.actions.export_csv')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('user.actions.confirm_ban.title')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {banScope === 'selected'
              ? t('user.filter.selected', { count: selectedIds.size })
              : banScope === 'filtered'
                ? t('user.actions.confirm_ban.filtered_description')
                : t('user.actions.confirm_ban.all_description')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanOpen(false)}>
              {t('user.actions.confirm_ban.cancel')}
            </Button>
            <Button variant="destructive" onClick={batchBan} disabled={banning}>
              {banning
                ? t('user.actions.confirm_ban.banning')
                : t('user.actions.confirm_ban.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogMode === 'create'}
        onOpenChange={(o) => !o && setDialogMode(null)}
      >
        <DialogContent className="!flex h-[468px] max-h-[468px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[576px]">
          <DialogHeader className="shrink-0 border-b px-6 pb-4 pt-6">
            <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
              {t('user.generate.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 px-6 py-4 text-sm">
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-1.5">
              <Label className={dialogFieldLabelCls}>
                {t('user.generate.form.email')}
                <span className="ml-1 text-destructive">*</span>
              </Label>
              <div className="flex min-h-9 w-full items-center">
              <div className="flex w-full items-center gap-0">
                {!form.generate_count ? (
                  <input
                    className={cn(dialogCompactInputCls, 'flex-[5] rounded-l-md border-r-0')}
                    placeholder={t('user.generate.form.email_prefix')}
                    value={String(form.email_prefix ?? '')}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email_prefix: e.target.value }))
                    }
                  />
                ) : null}
                <div className="flex h-[34px] items-center border-y border-input bg-muted/30 px-3 font-mono text-xs text-muted-foreground border-l-0">
                  @
                </div>
                <input
                  className={cn(dialogCompactInputCls, 'flex-[4] rounded-l-none rounded-r-md border-l-0')}
                  placeholder={t('user.generate.form.email_domain')}
                  value={String(form.email_suffix ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, email_suffix: e.target.value }))}
                />
              </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className={dialogFieldLabelCls}>
                {t('user.generate.form.password')}
              </Label>
              <input
                className={dialogCompactInputCls}
                type="password"
                placeholder={t('user.generate.form.password_placeholder')}
                value={String(form.password ?? '')}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
              <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={dialogFieldLabelCls}>
                  {t('user.generate.form.expire_time')}
                </Label>
                <ExpireDateInput
                  value={form.expired_at as number | null | undefined}
                  onChange={(ts) => setForm((f) => ({ ...f, expired_at: ts }))}
                  placeholder={t('user.generate.form.expire_time_placeholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={dialogFieldLabelCls}>
                  {t('user.generate.form.subscription')}
                </Label>
                <FormSelect
                  className={dialogSelectCls}
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
                      label: t('user.generate.form.subscription_none'),
                    },
                    ...plans.map((p) => ({ value: String(p.id), label: String(p.name) })),
                  ]}
                />
              </div>
            </div>
            {!form.email_prefix ? (
              <div className="space-y-1.5">
                <Label className={dialogFieldLabelCls}>
                  {t('user.generate.form.generate_count')}
                </Label>
                <input
                  type="number"
                  className={dialogCompactInputCls}
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
            </form>
            </div>
          </div>
          <DialogFormFooter
            onCancel={() => setDialogMode(null)}
            onSubmit={saveUser}
            cancelLabel={t('user.generate.form.cancel')}
            submitLabel={saving ? t('common.saving') : t('common.confirm')}
            submitting={saving}
          />
        </DialogContent>
      </Dialog>

      <Sheet open={dialogMode === 'edit'} onOpenChange={(o) => !o && setDialogMode(null)}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex w-full max-w-[90%] flex-col gap-4 overflow-y-scroll p-6 sm:w-[448px] sm:max-w-[448px]"
        >
          <SheetHeader className="mt-4 p-0">
            <SheetTitle>{t('user.edit.title')}</SheetTitle>
            <p className="m-0 h-0 overflow-hidden p-0 text-sm text-muted-foreground" aria-hidden>
              {'\u00a0'}
            </p>
          </SheetHeader>
              <div className={editSheetFieldCls}>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.email')}
                </Label>
                <input
                  className={inputCls}
                  value={String(form.email ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className={editSheetFieldCls}>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.inviter_email')}
                </Label>
                <input
                  className={inputCls}
                  value={String(form.invite_user_email ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, invite_user_email: e.target.value }))}
                  placeholder={t('user.edit.form.inviter_email_placeholder')}
                />
              </div>
              <div className={editSheetFieldCls}>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.password')}
                </Label>
                <input
                  className={inputCls}
                  type="password"
                  placeholder={t('user.edit.form.password_placeholder')}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value || undefined }))}
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className={editSheetFieldCls}>
                  <Label className={sheetFieldLabelCls}>
                    {t('user.edit.form.balance')}
                  </Label>
                  <SuffixInput
                    suffix={currencySymbol}
                    type="number"
                    value={Number(form.balance ?? 0)}
                    onChange={(e) => setForm((f) => ({ ...f, balance: Number(e.target.value) }))}
                    placeholder={t('user.edit.form.balance_placeholder')}
                  />
                </div>
                <div className={editSheetFieldCls}>
                  <Label className={sheetFieldLabelCls}>
                    {t('user.edit.form.commission_balance')}
                  </Label>
                  <SuffixInput
                    suffix={currencySymbol}
                    type="number"
                    value={Number(form.commission_balance ?? 0)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, commission_balance: Number(e.target.value) }))
                    }
                    placeholder={t('user.edit.form.commission_balance_placeholder')}
                  />
                </div>
                <div className={editSheetFieldCls}>
                  <Label className={sheetFieldLabelCls}>
                    {t('user.edit.form.upload')}
                  </Label>
                  <SuffixInput
                    suffix="GB"
                    type="number"
                    step="any"
                    value={form.u ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, u: e.target.value }))}
                    placeholder={t('user.edit.form.upload_placeholder')}
                  />
                </div>
                <div className={editSheetFieldCls}>
                  <Label className={sheetFieldLabelCls}>
                    {t('user.edit.form.download')}
                  </Label>
                  <SuffixInput
                    suffix="GB"
                    type="number"
                    step="any"
                    value={form.d ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, d: e.target.value }))}
                    placeholder={t('user.edit.form.download_placeholder')}
                  />
                </div>
              </div>
              <div className={editSheetFieldCls}>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.total_traffic')}
                </Label>
                <SuffixInput
                  suffix="GB"
                  type="number"
                  step="any"
                  value={
                    form.transfer_enable != null && form.transfer_enable !== ''
                      ? Number(form.transfer_enable)
                      : ''
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      transfer_enable: e.target.value === '' ? 0 : Number(e.target.value),
                    }))
                  }
                  placeholder={t('user.edit.form.total_traffic_placeholder')}
                />
              </div>
              <div className={editSheetExpireFieldCls}>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.expire_time')}
                </Label>
                <ExpireDateInput
                  className={editSheetExpireBtnCls}
                  value={form.expired_at as number | null | undefined}
                  onChange={(ts) => setForm((f) => ({ ...f, expired_at: ts }))}
                  placeholder={t('user.edit.form.expire_time_placeholder')}
                />
              </div>
              <div className={editSheetFieldCls}>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.subscription')}
                </Label>
                <FormSelect
                  className={editSheetSelectCls}
                  value={String(form.plan_id ?? '')}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      plan_id: v ? Number(v) : null,
                    }))
                  }
                  options={[
                    { value: '', label: t('user.edit.form.subscription_none') },
                    ...plans.map((p) => ({ value: String(p.id), label: String(p.name) })),
                  ]}
                />
              </div>
              <div className={editSheetFieldCls}>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.account_status')}
                </Label>
                <FormSelect
                  className={editSheetSelectCls}
                  value={form.banned ? 'true' : 'false'}
                  onChange={(v) => setForm((f) => ({ ...f, banned: v === 'true' }))}
                  options={[
                    { value: 'true', label: t('user.columns.status_text.banned') },
                    { value: 'false', label: t('user.columns.status_text.normal') },
                  ]}
                />
              </div>
              <div className={editSheetFieldCls}>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.commission_type')}
                </Label>
                <FormSelect
                  className={editSheetSelectCls}
                  value={String(form.commission_type ?? 0)}
                  onChange={(v) => setForm((f) => ({ ...f, commission_type: Number(v) }))}
                  options={[
                    { value: '0', label: t('user.edit.form.commission_type_system') },
                    { value: '1', label: t('user.edit.form.commission_type_cycle') },
                    { value: '2', label: t('user.edit.form.commission_type_onetime') },
                  ]}
                />
              </div>
              <div className={editSheetFieldCls}>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.commission_rate')}
                </Label>
                <SuffixInput
                  suffix="%"
                  type="number"
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
              <div className={editSheetFieldCls}>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.discount')}
                </Label>
                <SuffixInput
                  suffix="%"
                  type="number"
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
              <div className={editSheetFieldCls}>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.speed_limit')}
                </Label>
                <SuffixInput
                  suffix="Mbps"
                  type="number"
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
              <div className={editSheetFieldCls}>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.device_limit')}
                </Label>
                <SuffixInput
                  suffix={t('user.edit.form.device_limit_unit')}
                  type="number"
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
              <div className={editSheetSwitchFieldCls} data-mask-switch-row>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.is_admin')}
                </Label>
                <div className={editSheetSwitchWrapCls}>
                  <Switch
                    checked={Boolean(form.is_admin)}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_admin: v }))}
                  />
                </div>
              </div>
              <div className={editSheetSwitchFieldCls} data-mask-switch-row>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.is_staff')}
                </Label>
                <div className={editSheetSwitchWrapCls}>
                  <Switch
                    checked={Boolean(form.is_staff)}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, is_staff: v }))}
                  />
                </div>
              </div>
              <div className={editSheetRemarksFieldCls}>
                <Label className={sheetFieldLabelCls}>
                  {t('user.edit.form.remarks')}
                </Label>
                <textarea
                  className="flex !min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={String(form.remarks ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                  placeholder={t('user.edit.form.remarks_placeholder')}
                />
              </div>
          <SheetFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDialogMode(null)}>
              {t('user.edit.form.cancel')}
            </Button>
            <Button onClick={saveUser} disabled={saving}>
              {t('user.edit.form.submit')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={trafficResetUser !== null} onOpenChange={(o) => !o && closeTrafficReset()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('user.traffic_reset.title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('user.traffic_reset.description', { email: trafficResetUser?.email ?? '' })}
          </p>
          <Tabs
            value={trafficResetTab}
            onValueChange={(v) => setTrafficResetTab(v as 'reset' | 'history')}
          >
            <TabsList className="grid h-9 w-full grid-cols-2">
              <TabsTrigger value="reset">
                {t('user.traffic_reset.tabs.reset')}
              </TabsTrigger>
              <TabsTrigger value="history">
                {t('user.traffic_reset.tabs.history')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="reset" className="mt-4 space-y-4">
              <textarea
                className={textareaCls}
                value={trafficResetReason}
                onChange={(e) => setTrafficResetReason(e.target.value)}
                placeholder={t('user.traffic_reset.reason.placeholder')}
              />
              <DialogFooter className="gap-2 sm:justify-end">
                <Button variant="outline" onClick={closeTrafficReset}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={resetTrafficForUser} disabled={trafficResetting}>
                  {trafficResetting
                    ? t('user.traffic_reset.resetting')
                    : t('user.traffic_reset.confirm_reset')}
                </Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="history" className="mt-4 space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('user.traffic_reset.history.reset_count')}
                  </p>
                  <p className="text-sm font-medium">
                    {trafficResetHistory?.user?.reset_count ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('user.traffic_reset.history.last_reset')}
                  </p>
                  <p className="text-sm font-medium">
                    {trafficResetHistory?.user?.last_reset_at
                      ? formatAdminDateTime(trafficResetHistory.user.last_reset_at)
                      : t('user.traffic_reset.history.never')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t('user.traffic_reset.history.next_reset')}
                  </p>
                  <p className="text-sm font-medium">
                    {trafficResetHistory?.user?.next_reset_at
                      ? formatAdminDateTime(trafficResetHistory.user.next_reset_at)
                      : t('user.traffic_reset.history.no_schedule')}
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">
                  {t('user.traffic_reset.history.recent_records')}
                </p>
                {!trafficResetHistoryLoading &&
                (trafficResetHistory?.history?.length ?? 0) === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {t('user.traffic_reset.history.no_records')}
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
                  {t('common.close')}
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <UserInvitesSheet
        userId={invitesUser?.id}
        email={invitesUser?.email}
        plans={plans}
        open={invitesUser !== null}
        onOpenChange={(o) => !o && setInvitesUser(null)}
      />

      <UserTrafficRecordsDialog
        userId={trafficRecordsUser?.id}
        email={trafficRecordsUser?.email}
        open={trafficRecordsUser !== null}
        onOpenChange={(o) => !o && setTrafficRecordsUser(null)}
      />

      <Dialog open={assignUser !== null} onOpenChange={(o) => !o && setAssignUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('user.columns.actions_menu.assign_order')}</DialogTitle>
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
                <option value="">{t('order.dialog.fields.subscriptionPlan')}</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
                  <div className="space-y-2">
              <Label>{t('order.dialog.fields.orderPeriod')}</Label>
              <select
                className={inputCls}
                value={assignForm.period}
                onChange={(e) => setAssignForm((f) => ({ ...f, period: e.target.value }))}
              >
                {ORDER_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {t(`order.period.${period}`)}
                  </option>
                ))}
              </select>
            </div>
                  <div className="space-y-2">
              <Label>{t('order.dialog.fields.paymentAmount')}</Label>
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
              {t('common.cancel')}
            </Button>
            <Button onClick={assignOrder} disabled={assigning}>
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  )
}
