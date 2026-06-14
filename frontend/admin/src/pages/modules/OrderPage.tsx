import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { IconArrowsSort, IconDots, IconExternalLink } from '@tabler/icons-react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { adminApi, fetchJsonList, postJson, type PaginatedResult } from '@/lib/api'
import { formatAdminMoney, loadAdminCurrency } from '@/lib/currency'
import { inputCls } from '@/lib/form-styles'
import { cn } from '@/lib/utils'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type OrderRow = {
  id?: number
  trade_no?: string
  plan_id?: number
  plan?: { name?: string }
  total_amount?: number
  status?: number
  type?: number
  period?: string
  commission_balance?: number
  commission_status?: number
  created_at?: number
  updated_at?: number
  user_id?: number
}

type PlanRow = { id?: number; name?: string }

type OrderDetail = {
  trade_no?: string
  type?: number
  period?: string
  status?: number
  total_amount?: number
  balance_amount?: number
  discount_amount?: number
  surplus_amount?: number
  surplus_credit?: number
  callback_no?: string
  created_at?: number
  updated_at?: number
  paid_at?: number
  commission_status?: number
  commission_balance?: number
  actual_commission_balance?: number
  invite_user_id?: number
  plan?: { name?: string }
  user?: { email?: string }
  invite_user?: { email?: string }
}

const TYPE_KEYS = [1, 2, 3, 4] as const
const PERIOD_KEYS = [
  'month_price',
  'quarter_price',
  'half_year_price',
  'year_price',
  'two_year_price',
  'three_year_price',
  'onetime_price',
  'reset_price',
] as const

const LEGACY_TO_NEW_PERIOD: Record<string, string> = {
  month_price: 'monthly',
  quarter_price: 'quarterly',
  half_year_price: 'half_yearly',
  year_price: 'yearly',
  two_year_price: 'two_yearly',
  three_year_price: 'three_yearly',
  onetime_price: 'onetime',
  reset_price: 'reset_traffic',
}
const STATUS_KEYS = [0, 1, 2, 3, 4] as const
const COMMISSION_KEYS = [0, 1, 2, 3] as const

const TYPE_I18N: Record<number, string> = {
  1: 'order.type.NEW',
  2: 'order.type.RENEWAL',
  3: 'order.type.UPGRADE',
  4: 'order.type.RESET_FLOW',
}

const STATUS_I18N: Record<number, string> = {
  0: 'order.status.PENDING',
  1: 'order.status.PROCESSING',
  2: 'order.status.CANCELLED',
  3: 'order.status.COMPLETED',
  4: 'order.status.DISCOUNTED',
}

const COMMISSION_I18N: Record<number, string> = {
  0: 'order.commission.PENDING',
  1: 'order.commission.PROCESSING',
  2: 'order.commission.VALID',
  3: 'order.commission.INVALID',
}

function formatMoney(cents?: number | null) {
  return formatAdminMoney(cents ?? 0)
}

function formatTs(ts?: number | null) {
  if (!ts) return '—'
  const d = new Date(ts * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function truncateTradeNo(no?: string) {
  if (!no) return '—'
  if (no.length <= 9) return no
  return `${no.slice(0, 3)}...${no.slice(-3)}`
}

function formatCommissionAmount(balance?: number | null) {
  if (balance == null || balance === 0) return '-'
  return formatMoney(balance)
}

const STATUS_DOT_CLS: Record<number, string> = {
  0: 'text-yellow-500',
  1: 'text-blue-500',
  2: 'text-red-500',
  3: 'text-green-500',
  4: 'text-muted-foreground',
}

function OrderStatusHelpIcon() {
  return (
    <svg
      className="h-4 w-4 text-muted-foreground/70 transition-colors hover:text-muted-foreground"
      viewBox="0 0 24 24"
      width="1.2em"
      height="1.2em"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M11.29 15.29a2 2 0 0 0-.12.15a.8.8 0 0 0-.09.18a.6.6 0 0 0-.06.18a1.4 1.4 0 0 0 0 .2a.84.84 0 0 0 .08.38a.9.9 0 0 0 .54.54a.94.94 0 0 0 .76 0a.9.9 0 0 0 .54-.54A1 1 0 0 0 13 16a1 1 0 0 0-.29-.71a1 1 0 0 0-1.42 0M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8m0-13a3 3 0 0 0-2.6 1.5a1 1 0 1 0 1.73 1A1 1 0 0 1 12 9a1 1 0 0 1 0 2a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-.18A3 3 0 0 0 12 7"
      />
    </svg>
  )
}

function IonPlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      aria-hidden
      role="img"
      className="iconify iconify--ion"
      width="1em"
      height="1em"
      viewBox="0 0 512 512"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
        d="M256 112v288m144-144H112"
      />
    </svg>
  )
}

function FilterPopover({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-md border-dashed px-3 text-xs h-8">
          <FilterPlusIcon />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-1" align="start">
        {children}
      </PopoverContent>
    </Popover>
  )
}

function FilterOption({
  children,
  onSelect,
}: {
  children: ReactNode
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
      onClick={onSelect}
    >
      {children}
    </button>
  )
}

function FilterPlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="mr-2 h-4 w-4">
      <path
        d="M7.49991 0.876892C3.84222 0.876892 0.877075 3.84204 0.877075 7.49972C0.877075 11.1574 3.84222 14.1226 7.49991 14.1226C11.1576 14.1226 14.1227 11.1574 14.1227 7.49972C14.1227 3.84204 11.1576 0.876892 7.49991 0.876892ZM1.82707 7.49972C1.82707 4.36671 4.36689 1.82689 7.49991 1.82689C10.6329 1.82689 13.1727 4.36671 13.1727 7.49972C13.1727 10.6327 10.6329 13.1726 7.49991 13.1726C4.36689 13.1726 1.82707 10.6327 1.82707 7.49972ZM7.50003 4C7.77617 4 8.00003 4.22386 8.00003 4.5V7H10.5C10.7762 7 11 7.22386 11 7.5C11 7.77614 10.7762 8 10.5 8H8.00003V10.5C8.00003 10.7761 7.77617 11 7.50003 11C7.22389 11 7.00003 10.7761 7.00003 10.5V8H4.50003C4.22389 8 4.00003 7.77614 4.00003 7.5C4.00003 7.22386 4.22389 7 4.50003 7H7.00003V4.5C7.00003 4.22386 7.22389 4 7.50003 4Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  )
}

function DetailRow({
  label,
  value,
  mono,
  valueClassName,
}: {
  label: string
  value?: ReactNode
  mono?: boolean
  valueClassName?: string
}) {
  return (
    <div className="flex items-center py-1.5">
      <div className="w-28 shrink-0 text-sm text-muted-foreground">{label}</div>
      <div className={cn('text-sm', mono && 'font-mono text-xs', valueClassName)}>{value || '—'}</div>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">{children}</div>
    </div>
  )
}

function StatusDot({ status }: { status?: number }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-4 w-4', STATUS_DOT_CLS[status ?? -1] ?? 'text-muted-foreground')}
      aria-hidden
    >
      <path
        d="M0.877075 7.49991C0.877075 3.84222 3.84222 0.877075 7.49991 0.877075C11.1576 0.877075 14.1227 3.84222 14.1227 7.49991C14.1227 11.1576 11.1576 14.1227 7.49991 14.1227C3.84222 14.1227 0.877075 11.1576 0.877075 7.49991ZM7.49991 1.82708C4.36689 1.82708 1.82708 4.36689 1.82708 7.49991C1.82708 10.6329 4.36689 13.1727 7.49991 13.1727C10.6329 13.1727 13.1727 10.6329 13.1727 7.49991C13.1727 4.36689 10.6329 1.82708 7.49991 1.82708Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function OrderPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [data, setData] = useState<OrderRow[]>([])
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignForm, setAssignForm] = useState({
    email: '',
    plan_id: '',
    period: 'month_price',
    total_amount: '',
  })
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [typeFilter, setTypeFilter] = useState<number | null>(null)
  const [periodFilter, setPeriodFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<number | null>(null)
  const [commissionFilter, setCommissionFilter] = useState<number | null>(null)
  const [commissionBalanceFilter, setCommissionBalanceFilter] = useState<string | null>(null)
  const [statusSortDesc, setStatusSortDesc] = useState<boolean | null>(null)
  const [userIdFilter, setUserIdFilter] = useState<number | null>(null)

  useEffect(() => {
    void loadAdminCurrency()
  }, [])

  useEffect(() => {
    const commissionStatus = searchParams.get('commission_status')
    const status = searchParams.get('status')
    const commissionBalance = searchParams.get('commission_balance')
    const userId = searchParams.get('user_id')
    if (commissionStatus != null && commissionStatus !== '') {
      setCommissionFilter(Number(commissionStatus))
    }
    if (status != null && status !== '') {
      setStatusFilter(Number(status))
    }
    if (commissionBalance) {
      setCommissionBalanceFilter(commissionBalance)
    }
    if (userId != null && userId !== '') {
      setUserIdFilter(Number(userId))
    }
    if (commissionStatus || status || commissionBalance || userId) {
      setPage(1)
    }
  }, [searchParams])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const load = useCallback(() => {
    setLoading(true)
    const filter: { id: string; value: string | number }[] = []
    if (search.trim()) filter.push({ id: 'trade_no', value: search.trim() })
    if (userIdFilter != null) filter.push({ id: 'user_id', value: userIdFilter })
    if (typeFilter != null) filter.push({ id: 'type', value: typeFilter })
    if (periodFilter) {
      filter.push({
        id: 'period',
        value: LEGACY_TO_NEW_PERIOD[periodFilter] ?? periodFilter,
      })
    }
    if (statusFilter != null) filter.push({ id: 'status', value: statusFilter })
    if (commissionFilter != null) filter.push({ id: 'commission_status', value: commissionFilter })
    if (commissionBalanceFilter) filter.push({ id: 'commission_balance', value: commissionBalanceFilter })

    const body: Record<string, unknown> = { current: page, pageSize }
    if (filter.length) body.filter = filter
    if (statusSortDesc != null) {
      body.sort = [{ id: 'status', desc: statusSortDesc }]
    }

    adminApi<PaginatedResult<OrderRow>>('/order/fetch', {
      method: 'POST',
      body: JSON.stringify(body),
    })
      .then((res) => {
        setData(Array.isArray(res.data) ? res.data : [])
        setTotal(res.total ?? 0)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [page, pageSize, search, userIdFilter, typeFilter, periodFilter, statusFilter, commissionFilter, commissionBalanceFilter, statusSortDesc, t])

  useEffect(() => {
    fetchJsonList('/plan/fetch').then((rows) => setPlans(rows as PlanRow[]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function assignOrder() {
    try {
      const amountYuan = Number(assignForm.total_amount)
      if (!assignForm.email.trim() || !assignForm.plan_id || !assignForm.period || !amountYuan) {
        toast.error(t('common.error'))
        return
      }
      await postJson('/order/assign', {
        email: assignForm.email.trim(),
        plan_id: Number(assignForm.plan_id),
        period: assignForm.period,
        total_amount: Math.round(amountYuan * 100),
      })
      toast.success(t('common.success'))
      setAssignOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function markPaid(tradeNo?: string) {
    if (!tradeNo) return
    try {
      await postJson('/order/paid', { trade_no: tradeNo })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function cancelOrder(tradeNo?: string) {
    if (!tradeNo) return
    try {
      await postJson('/order/cancel', { trade_no: tradeNo })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function openDetail(row: OrderRow) {
    if (!row.id) return
    setDetailOpen(true)
    setDetailLoading(true)
    setDetail(null)
    try {
      const data = await postJson<OrderDetail>('/order/detail', { id: row.id })
      setDetail(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
      setDetailOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  async function updateCommissionStatus(tradeNo?: string, commissionStatus?: number) {
    if (!tradeNo || commissionStatus == null) return
    try {
      await postJson('/order/update', { trade_no: tradeNo, commission_status: commissionStatus })
      toast.success(t('common.success'))
      if (detail?.trade_no === tradeNo) {
        setDetail((prev) => (prev ? { ...prev, commission_status: commissionStatus } : prev))
      }
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  const columns = useMemo<ColumnDef<OrderRow, unknown>[]>(
    () => [
      {
        accessorKey: 'trade_no',
        header: () => t('order.table.columns.tradeNo'),
        cell: ({ row }) => (
          <div className="flex items-center">
            <button
              type="button"
              aria-haspopup="dialog"
              className="flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
              onClick={() => openDetail(row.original)}
            >
              <span className="font-mono">{truncateTradeNo(row.original.trade_no)}</span>
              <IconExternalLink className="tabler-icon h-3.5 w-3.5 opacity-70" stroke={2} />
            </button>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: () => t('order.table.columns.type'),
        cell: ({ row }) => {
          const key = TYPE_I18N[row.original.type ?? 0]
          const label = key ? t(key) : String(row.original.type ?? '')
          return (
            <div className="inline-flex items-center rounded-md border border-border/50 bg-slate-100/80 px-2.5 py-0.5 text-xs font-medium text-nowrap text-slate-700 transition-colors hover:bg-slate-200/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              {label}
            </div>
          )
        },
      },
      {
        accessorKey: 'plan_id',
        header: () => t('order.table.columns.plan'),
        cell: ({ row }) => (
          <div className="flex space-x-2">
            <span className="max-w-32 truncate font-medium text-foreground/90 sm:max-w-72 md:max-w-[31rem]">
              {row.original.plan?.name ?? row.original.plan_id}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'period',
        header: () => t('order.table.columns.period'),
        cell: ({ row }) => {
          const p = row.original.period
          if (!p) return '—'
          const key = `order.period.${p}`
          const label = t(key)
          return (
            <div className="inline-flex items-center rounded-md border border-transparent bg-slate-100/80 px-2.5 py-0.5 text-xs font-medium text-nowrap text-slate-700 transition-colors hover:bg-secondary/80 hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              {label}
            </div>
          )
        },
      },
      {
        accessorKey: 'total_amount',
        header: () => t('order.table.columns.amount'),
        cell: ({ row }) => (
          <div className="flex items-center font-mono text-foreground/90">
            {formatMoney(row.original.total_amount)}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: () => (
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="-ml-3 flex h-8 items-center justify-center gap-2 text-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/60 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => {
                    setStatusSortDesc((prev) => (prev == null ? false : !prev))
                    setPage(1)
                  }}
                >
                  <span>{t('order.table.columns.status')}</span>
                  <IconArrowsSort className="tabler-icon h-4 w-4 text-muted-foreground/70 transition-colors hover:text-foreground/70" stroke={2} />
                </button>
              </div>
            </div>
            <button data-state="closed">
              <OrderStatusHelpIcon />
            </button>
          </div>
        ),
        cell: ({ row }) => {
          const key = STATUS_I18N[row.original.status ?? -1]
          const status = key ? t(key) : String(row.original.status ?? '')
          const pending = row.original.status === 0
          return (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusDot status={row.original.status} />
                <span className="text-sm font-medium">{status}</span>
              </div>
              {pending ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center gap-2 whitespace-nowrap rounded-md p-0 text-xs font-medium transition-colors hover:bg-muted/60 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                    >
                      <IconDots className="tabler-icon h-4 w-4" stroke={2} />
                      <span className="sr-only">{t('order.actions.openMenu')}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => markPaid(row.original.trade_no)}>
                      {t('order.actions.markAsPaid')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => cancelOrder(row.original.trade_no)}>
                      {t('order.actions.cancel')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: 'commission_balance',
        header: () => t('order.table.columns.commission'),
        cell: ({ row }) => (
          <div className="flex items-center font-mono text-foreground/90">
            {formatCommissionAmount(row.original.commission_balance)}
          </div>
        ),
      },
      {
        accessorKey: 'commission_status',
        header: () => t('order.table.columns.commissionStatus'),
        cell: ({ row }) => {
          const balance = row.original.commission_balance
          const status = row.original.commission_status
          if ((balance == null || balance === 0) && (status == null || status === 0)) {
            return <span className="text-muted-foreground">-</span>
          }
          const key = COMMISSION_I18N[status ?? -1]
          const label = key ? t(key) : '-'
          if (!balance || balance <= 0) {
            return <span className="text-muted-foreground">{label}</span>
          }
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-transparent bg-secondary/60 px-2 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  {label}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[120px]">
                {COMMISSION_KEYS.filter((v) => v !== status).map((v) => (
                  <DropdownMenuItem
                    key={v}
                    className={v === 3 ? 'text-destructive focus:text-destructive' : undefined}
                    onClick={() => updateCommissionStatus(row.original.trade_no, v)}
                  >
                    {t(COMMISSION_I18N[v])}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: () => t('order.table.columns.createdAt'),
        cell: ({ row }) => (
          <div className="text-nowrap font-mono text-sm text-muted-foreground">
            {formatTs(row.original.created_at)}
          </div>
        ),
      },
    ],
    [t],
  )

  return (
    <div>
      <div className="mb-2">
        <h2 className="m-0 text-2xl font-bold tracking-tight">{t('order.title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('order.description')}</p>
      </div>
      <div className="-mx-4 flex-1 overflow-auto px-4 py-1">
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-md px-3 text-xs h-8 space-x-2"
              aria-haspopup="dialog"
              onClick={() => setAssignOpen(true)}
            >
              <IonPlusIcon />
              <div>{t('order.dialog.addOrder')}</div>
            </Button>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t('order.search.placeholder')}
              className={cn(inputCls, 'h-8 w-[250px] shrink-0 px-3 py-1')}
            />
            <FilterPopover label={t('order.table.columns.type')}>
              <FilterOption
                onSelect={() => {
                  setTypeFilter(null)
                  setPage(1)
                }}
              >
                {t('order.actions.reset')}
              </FilterOption>
              {TYPE_KEYS.map((v) => (
                <FilterOption
                  key={v}
                  onSelect={() => {
                    setTypeFilter(v)
                    setPage(1)
                  }}
                >
                  {t(TYPE_I18N[v])}
                </FilterOption>
              ))}
            </FilterPopover>
            <FilterPopover label={t('order.table.columns.period')}>
              <FilterOption
                onSelect={() => {
                  setPeriodFilter(null)
                  setPage(1)
                }}
              >
                {t('order.actions.reset')}
              </FilterOption>
              {PERIOD_KEYS.map((p) => (
                <FilterOption
                  key={p}
                  onSelect={() => {
                    setPeriodFilter(p)
                    setPage(1)
                  }}
                >
                  {t(`order.period.${p}`)}
                </FilterOption>
              ))}
            </FilterPopover>
            <FilterPopover label={t('order.table.columns.status')}>
              <FilterOption
                onSelect={() => {
                  setStatusFilter(null)
                  setPage(1)
                }}
              >
                {t('order.actions.reset')}
              </FilterOption>
              {STATUS_KEYS.map((v) => (
                <FilterOption
                  key={v}
                  onSelect={() => {
                    setStatusFilter(v)
                    setPage(1)
                  }}
                >
                  {t(STATUS_I18N[v])}
                </FilterOption>
              ))}
            </FilterPopover>
            <FilterPopover label={t('order.table.columns.commissionStatus')}>
              <FilterOption
                onSelect={() => {
                  setCommissionFilter(null)
                  setPage(1)
                }}
              >
                {t('order.actions.reset')}
              </FilterOption>
              {COMMISSION_KEYS.map((v) => (
                <FilterOption
                  key={v}
                  onSelect={() => {
                    setCommissionFilter(v)
                    setPage(1)
                  }}
                >
                  {t(COMMISSION_I18N[v])}
                </FilterOption>
              ))}
            </FilterPopover>
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
            colWidths={[113, 119, 148, 86, 193, 180, 217, 203, 162]}
            headClassName="h-11 bg-card px-4"
            cellClassName="p-2 align-middle bg-card"
            tableClassName="relative overflow-auto rounded-md border bg-card [&_table]:w-max [&_table]:min-w-[1422px] [&_tbody_tr]:h-[49px]"
          />
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-medium">{t('order.dialog.title')}</DialogTitle>
            {detail ? (
              <div className="flex items-center text-sm">
                <div className="text-muted-foreground">
                  {t('order.table.columns.tradeNo')}：{detail.trade_no}
                </div>
                {detail.status != null ? (
                  <div className="ml-6 flex items-center gap-1.5">
                    <StatusDot status={detail.status} />
                    <span>
                      {STATUS_I18N[detail.status]
                        ? t(STATUS_I18N[detail.status])
                        : String(detail.status)}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : detail ? (
            <div className="space-y-4 text-sm">
              <DetailSection title={t('order.dialog.basicInfo')}>
                <DetailRow
                  label={t('order.table.columns.type')}
                  value={
                    TYPE_I18N[detail.type ?? 0]
                      ? t(TYPE_I18N[detail.type ?? 0])
                      : String(detail.type ?? '—')
                  }
                />
                <DetailRow label={t('order.table.columns.plan')} value={detail.plan?.name ?? '—'} />
                <DetailRow
                  label={t('order.table.columns.period')}
                  value={detail.period ? t(`order.period.${detail.period}`) : '—'}
                />
                {detail.user?.email ? (
                  <DetailRow label={t('order.dialog.fields.userEmail')} value={detail.user.email} />
                ) : null}
                <DetailRow
                  label={t('order.dialog.fields.callbackNo')}
                  value={detail.callback_no || '—'}
                  mono
                />
              </DetailSection>
              <DetailSection title={t('order.dialog.amountInfo')}>
                <DetailRow
                  label={t('order.dialog.fields.paymentAmount')}
                  value={formatMoney(detail.total_amount)}
                  valueClassName="font-medium text-primary"
                />
                <DetailRow
                  label={t('order.dialog.fields.balancePayment')}
                  value={formatMoney(detail.balance_amount)}
                />
                <DetailRow
                  label={t('order.dialog.fields.discountAmount')}
                  value={formatMoney(detail.discount_amount)}
                  valueClassName="text-green-600"
                />
                <DetailRow
                  label={t('order.dialog.fields.deductionAmount')}
                  value={formatMoney(detail.surplus_amount)}
                />
                <DetailRow
                  label={t('order.dialog.fields.refundAmount')}
                  value={formatMoney(detail.surplus_credit)}
                  valueClassName="text-red-600"
                />
              </DetailSection>
              <DetailSection title={t('order.dialog.timeInfo')}>
                <DetailRow
                  label={t('order.dialog.fields.createdAt')}
                  value={formatTs(detail.created_at)}
                  mono
                />
                <DetailRow
                  label={t('order.dialog.fields.updatedAt')}
                  value={formatTs(detail.updated_at)}
                  mono
                />
              </DetailSection>
              {(detail.commission_balance ?? 0) > 0 || detail.invite_user_id ? (
                <DetailSection title={t('order.dialog.commissionInfo')}>
                  <div className="flex items-center py-1.5">
                    <div className="w-28 shrink-0 text-sm text-muted-foreground">
                      {t('order.dialog.fields.commissionStatus')}
                    </div>
                    {(detail.commission_balance ?? 0) > 0 ? (
                      <select
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                        value={String(detail.commission_status ?? 0)}
                        onChange={(e) =>
                          updateCommissionStatus(detail.trade_no, Number(e.target.value))
                        }
                      >
                        {COMMISSION_KEYS.map((v) => (
                          <option key={v} value={v}>
                            {t(COMMISSION_I18N[v])}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm">
                        {COMMISSION_I18N[detail.commission_status ?? -1]
                          ? t(COMMISSION_I18N[detail.commission_status ?? -1])
                          : '—'}
                      </span>
                    )}
                  </div>
                  <DetailRow
                    label={t('order.dialog.fields.commissionAmount')}
                    value={formatMoney(detail.commission_balance)}
                  />
                  <DetailRow
                    label={t('order.dialog.fields.actualCommissionAmount')}
                    value={formatMoney(detail.actual_commission_balance)}
                  />
                  <DetailRow
                    label={t('order.dialog.fields.inviteUser')}
                    value={detail.invite_user?.email ?? '—'}
                  />
                  <DetailRow
                    label={t('order.dialog.fields.inviteUserId')}
                    value={detail.invite_user_id != null ? String(detail.invite_user_id) : '—'}
                  />
                </DetailSection>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              {t('order.dialog.actions.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('order.dialog.assignOrder')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>{t('order.dialog.fields.userEmail')}</Label>
              <input
                className={inputCls}
                value={assignForm.email}
                onChange={(e) => setAssignForm((f) => ({ ...f, email: e.target.value }))}
                placeholder={t('order.dialog.placeholders.email')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('order.dialog.fields.subscriptionPlan')}</Label>
              <select
                className={inputCls}
                value={assignForm.plan_id}
                onChange={(e) => setAssignForm((f) => ({ ...f, plan_id: e.target.value }))}
              >
                <option value="">{t('order.dialog.placeholders.plan')}</option>
                {plans.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name ?? p.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('order.dialog.fields.orderPeriod')}</Label>
              <select
                className={inputCls}
                value={assignForm.period}
                onChange={(e) => setAssignForm((f) => ({ ...f, period: e.target.value }))}
              >
                {PERIOD_KEYS.map((p) => (
                  <option key={p} value={p}>
                    {t(`order.period.${p}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('order.dialog.fields.paymentAmount')}</Label>
              <input
                className={inputCls}
                type="number"
                min="0"
                step="0.01"
                value={assignForm.total_amount}
                onChange={(e) => setAssignForm((f) => ({ ...f, total_amount: e.target.value }))}
                placeholder={t('order.dialog.placeholders.amount')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              {t('order.dialog.actions.cancel')}
            </Button>
            <Button onClick={assignOrder}>
              {t('order.dialog.actions.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
