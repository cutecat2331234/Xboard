import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { IconDownload } from '@tabler/icons-react'
import { Bot, Clock, RefreshCw, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { fetchJsonObject, fetchPaginatedList } from '@/lib/api'
import { inputCls } from '@/lib/form-styles'
import { cn } from '@/lib/utils'
import { DataTable } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'

type TrafficLogRow = {
  id?: number
  user_id?: number
  user_email?: string
  reset_type?: string
  reset_type_name?: string
  reset_time?: string
  old_traffic?: { upload?: number; download?: number; total?: number; formatted?: string }
  new_traffic?: { upload?: number; download?: number; total?: number; formatted?: string }
  trigger_source?: string
  trigger_source_name?: string
  metadata?: Record<string, unknown> | null
  created_at?: string
}

type TrafficStats = {
  total_resets?: number
  auto_resets?: number
  manual_resets?: number
  cron_resets?: number
}

const RESET_TYPE_KEYS = [
  'monthly',
  'first_day_month',
  'yearly',
  'first_day_year',
  'manual',
] as const

const TRIGGER_SOURCE_KEYS = ['auto', 'manual', 'cron'] as const

const STATS_DAYS_OPTIONS = [
  { key: 'week', days: 7 },
  { key: 'month', days: 30 },
  { key: 'quarter', days: 90 },
  { key: 'year', days: 365 },
] as const

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function FilterPopover({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 rounded-md border-dashed px-3 text-xs">
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

function FilterOption({ children, onSelect }: { children: ReactNode; onSelect: () => void }) {
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

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows.map((row) => row.map((cell) => csvEscape(cell)).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function TrafficResetPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<TrafficLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<TrafficStats>({})
  const [statsDays, setStatsDays] = useState(30)
  const [search, setSearch] = useState('')
  const [resetTypeFilter, setResetTypeFilter] = useState<string | null>(null)
  const [triggerSourceFilter, setTriggerSourceFilter] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [exporting, setExporting] = useState(false)
  const pageSize = 20

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const buildListParams = useCallback(
    (overrides?: { page?: number; per_page?: number }) => {
      const params: Record<string, string | number> = {
        page: overrides?.page ?? page,
        per_page: overrides?.per_page ?? pageSize,
      }
      if (search.trim()) params.user_email = search.trim()
      if (resetTypeFilter) params.reset_type = resetTypeFilter
      if (triggerSourceFilter) params.trigger_source = triggerSourceFilter
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      return params
    },
    [page, pageSize, search, resetTypeFilter, triggerSourceFilter, startDate, endDate],
  )

  const load = useCallback(() => {
    setLoading(true)
    fetchPaginatedList<TrafficLogRow>('/traffic-reset/logs', buildListParams())
      .then((res) => {
        setData(res.data)
        setTotal(res.total)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [buildListParams, t])

  const loadStats = useCallback(() => {
    fetchJsonObject<TrafficStats>(`/traffic-reset/stats?days=${statsDays}`)
      .then(setStats)
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
  }, [statsDays, t])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  function resetFilters() {
    setSearch('')
    setResetTypeFilter(null)
    setTriggerSourceFilter(null)
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  async function exportLogs() {
    setExporting(true)
    try {
      const res = await fetchPaginatedList<TrafficLogRow>(
        '/traffic-reset/logs',
        buildListParams({ page: 1, per_page: 10000 }),
      )
      const header = [
        t('user.traffic_reset_logs.columns.id'),
        t('user.traffic_reset_logs.columns.user'),
        t('user.traffic_reset_logs.columns.reset_type'),
        t('user.traffic_reset_logs.columns.trigger_source'),
        t('user.traffic_reset_logs.columns.cleared_traffic'),
        t('user.traffic_reset_logs.columns.reset_time'),
        t('user.traffic_reset_logs.columns.log_time'),
      ]
      const rows = res.data.map((row) => [
        String(row.id ?? ''),
        row.user_email ?? '',
        row.reset_type_name ?? row.reset_type ?? '',
        row.trigger_source_name ?? row.trigger_source ?? '',
        row.old_traffic?.formatted ?? String(row.old_traffic?.total ?? ''),
        formatDateTime(row.reset_time),
        formatDateTime(row.created_at),
      ])
      downloadCsv('traffic-reset-logs.csv', [header, ...rows])
      toast.success(t('user.traffic_reset_logs.actions.export_success'))
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : t('user.traffic_reset_logs.actions.export_failed'),
      )
    } finally {
      setExporting(false)
    }
  }

  const resetTypeLabel = (type?: string, fallback?: string) => {
    if (!type) return fallback ?? '—'
    return t(`user.traffic_reset_logs.filters.reset_types.${type}`, {
      defaultValue: fallback ?? type,
    })
  }

  const triggerSourceLabel = (source?: string, fallback?: string) => {
    if (!source) return fallback ?? '—'
    return t(`user.traffic_reset_logs.filters.trigger_sources.${source}`, {
      defaultValue: fallback ?? source,
    })
  }

  const columns = useMemo<ColumnDef<TrafficLogRow, unknown>[]>(
    () => [
      {
        accessorKey: 'id',
        header: () => t('user.traffic_reset_logs.columns.id'),
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'user_email',
        header: () => t('user.traffic_reset_logs.columns.user'),
        cell: ({ row }) => (
          <span className="max-w-48 truncate font-medium">{row.original.user_email ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'reset_type',
        header: () => t('user.traffic_reset_logs.columns.reset_type'),
        cell: ({ row }) => (
          <div className="inline-flex items-center rounded-md border border-border/50 bg-slate-100/80 px-2.5 py-0.5 text-xs font-medium text-nowrap text-slate-700">
            {resetTypeLabel(row.original.reset_type, row.original.reset_type_name)}
          </div>
        ),
      },
      {
        accessorKey: 'trigger_source',
        header: () => t('user.traffic_reset_logs.columns.trigger_source'),
        cell: ({ row }) => (
          <div className="inline-flex items-center rounded-md border border-transparent bg-secondary/60 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            {triggerSourceLabel(row.original.trigger_source, row.original.trigger_source_name)}
          </div>
        ),
      },
      {
        accessorKey: 'old_traffic',
        header: () => t('user.traffic_reset_logs.columns.cleared_traffic'),
        cell: ({ row }) => (
          <div className="space-y-0.5 text-sm">
            <div className="font-mono text-foreground/90">
              {row.original.old_traffic?.formatted ?? '—'}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('user.traffic_reset_logs.columns.upload')}:{' '}
              {row.original.old_traffic?.upload ?? 0} /{' '}
              {t('user.traffic_reset_logs.columns.download')}:{' '}
              {row.original.old_traffic?.download ?? 0}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'reset_time',
        header: () => t('user.traffic_reset_logs.columns.reset_time'),
        cell: ({ row }) => (
          <div className="text-nowrap font-mono text-sm text-muted-foreground">
            {formatDateTime(row.original.reset_time)}
          </div>
        ),
      },
      {
        accessorKey: 'created_at',
        header: () => t('user.traffic_reset_logs.columns.log_time'),
        cell: ({ row }) => (
          <div className="text-nowrap font-mono text-sm text-muted-foreground">
            {formatDateTime(row.original.created_at)}
          </div>
        ),
      },
    ],
    [t],
  )

  return (
    <div>
      <div className="mb-2">
        <h2 className="m-0 text-2xl font-bold tracking-tight">
          {t('user.traffic_reset_logs.title')}
        </h2>
        <p className="mt-2 text-muted-foreground">{t('user.traffic_reset_logs.description')}</p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium">{t('user.traffic_reset.stats.title')}</h3>
            <p className="text-xs text-muted-foreground">
              {t('user.traffic_reset.stats.in_period', { days: statsDays })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STATS_DAYS_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                variant={statsDays === opt.days ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setStatsDays(opt.days)}
              >
                {t(`user.traffic_reset.stats.days_options.${opt.key}`)}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title={t('user.traffic_reset.stats.total_resets')}
            value={String(stats.total_resets ?? 0)}
            icon={RefreshCw}
          />
          <StatCard
            title={t('user.traffic_reset.stats.auto_resets')}
            value={String(stats.auto_resets ?? 0)}
            icon={Bot}
          />
          <StatCard
            title={t('user.traffic_reset.stats.manual_resets')}
            value={String(stats.manual_resets ?? 0)}
            icon={UserRound}
          />
          <StatCard
            title={t('user.traffic_reset.stats.cron_resets')}
            value={String(stats.cron_resets ?? 0)}
            icon={Clock}
          />
        </div>
      </div>

      <div className="-mx-4 flex-1 overflow-auto px-4 py-1">
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-md px-3 text-xs"
              onClick={exportLogs}
              disabled={exporting}
            >
              <IconDownload className="mr-2 h-4 w-4" stroke={2} />
              {exporting
                ? t('user.traffic_reset_logs.actions.exporting')
                : t('user.traffic_reset_logs.actions.export')}
            </Button>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t('user.traffic_reset_logs.filters.search_user')}
              className={cn(inputCls, 'h-8 w-[250px] shrink-0 px-3 py-1')}
            />
            <FilterPopover label={t('user.traffic_reset_logs.filters.reset_type')}>
              <FilterOption
                onSelect={() => {
                  setResetTypeFilter(null)
                  setPage(1)
                }}
              >
                {t('user.traffic_reset_logs.filters.all_types')}
              </FilterOption>
              {RESET_TYPE_KEYS.map((type) => (
                <FilterOption
                  key={type}
                  onSelect={() => {
                    setResetTypeFilter(type)
                    setPage(1)
                  }}
                >
                  {t(`user.traffic_reset_logs.filters.reset_types.${type}`)}
                </FilterOption>
              ))}
            </FilterPopover>
            <FilterPopover label={t('user.traffic_reset_logs.filters.trigger_source')}>
              <FilterOption
                onSelect={() => {
                  setTriggerSourceFilter(null)
                  setPage(1)
                }}
              >
                {t('user.traffic_reset_logs.filters.all_sources')}
              </FilterOption>
              {TRIGGER_SOURCE_KEYS.map((source) => (
                <FilterOption
                  key={source}
                  onSelect={() => {
                    setTriggerSourceFilter(source)
                    setPage(1)
                  }}
                >
                  {t(`user.traffic_reset_logs.filters.trigger_sources.${source}`)}
                </FilterOption>
              ))}
            </FilterPopover>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
              className={cn(inputCls, 'h-8 w-[150px] shrink-0 px-3 py-1')}
              aria-label={t('user.traffic_reset_logs.filters.start_date')}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
              className={cn(inputCls, 'h-8 w-[150px] shrink-0 px-3 py-1')}
              aria-label={t('user.traffic_reset_logs.filters.end_date')}
            />
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>
              {t('user.traffic_reset_logs.filters.reset')}
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
            headClassName="h-11 bg-card px-4"
            cellClassName="p-2 align-middle bg-card"
            tableClassName="relative overflow-auto rounded-md border bg-card"
          />
        </div>
      </div>
    </div>
  )
}
