import { useCallback, useEffect, useMemo, useState } from 'react'

import { format, subDays } from 'date-fns'

import {

  ArrowDownToLine,

  BarChart3,

  Bell,

  ChevronDown,

  Eye,

  MessageSquare,

  RefreshCw,

  Upload,

  User,

  Users,

  Wifi,

  MonitorSmartphone,

  ServerCog,

} from 'lucide-react'

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {

  Area,

  AreaChart,

  CartesianGrid,

  ResponsiveContainer,

  XAxis,

  YAxis,

} from 'recharts'

import {

  fetchDashboardStats,

  fetchHorizonFailedJobs,

  fetchOrderChart,

  fetchQueueStats,

  fetchTrafficRank,

  type DashboardStats,

  type HorizonFailedJob,

  type QueueStats,

} from '@/lib/api'

import { SystemUpdateNotice } from '@/components/dashboard/SystemUpdateNotice'
import {
  AuditLogPanel,
  QueueWorkloadPanel,
  SystemStatusPanel,
} from '@/components/dashboard/SystemMonitorPanels'
import { FormSelect } from '@/components/shared/FormSelect'
import { StatCard } from '@/components/shared/StatCard'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/api-errors'
import { getLocale, i18n } from '@/lib/i18n'

import {

  Dialog,

  DialogContent,

  DialogFooter,

  DialogHeader,

  DialogTitle,

} from '@/components/ui/dialog'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { formatAdminMoney, formatAdminMoneyFromMajor, loadAdminCurrency } from '@/lib/currency'



function formatMoney(cents?: number) {
  return formatAdminMoney(cents)
}



function formatFailedAt(value?: string | number) {

  if (value == null || value === '') return '—'

  let ts: number

  if (typeof value === 'string') {

    ts = parseInt(value, 10)

    if (Number.isNaN(ts)) return value

  } else {

    ts = value

  }

  const date = ts.toString().length === 10 ? new Date(ts * 1000) : new Date(ts)

  return date.toLocaleString(getLocale(), {

    year: 'numeric',

    month: '2-digit',

    day: '2-digit',

    hour: '2-digit',

    minute: '2-digit',

    second: '2-digit',

  })

}



function formatBytes(n?: number) {
  if (!n) return `0 ${i18n.t('common.units.b')}`
  const gb = n / 1073741824
  if (gb >= 1) return `${gb.toFixed(2)} ${i18n.t('common.units.gb')}`
  const mb = n / 1048576
  if (mb >= 1) return `${mb.toFixed(2)} ${i18n.t('common.units.mb')}`
  const kb = n / 1024
  return `${kb.toFixed(2)} ${i18n.t('common.units.kb')}`
}



type OverviewRange = '7d' | '30d' | '90d' | '180d' | '365d' | 'custom'
type TrafficRankRange = 'today' | 'last7days' | 'last30days' | 'custom'

function overviewWindow(
  range: OverviewRange,
  custom: { from: string; to: string },
): { start: string; end: string } {
  const end = format(new Date(), 'yyyy-MM-dd')
  if (range === 'custom') {
    return { start: custom.from, end: custom.to }
  }
  const days = { '7d': 7, '30d': 30, '90d': 90, '180d': 180, '365d': 365 }[range]
  return { start: format(subDays(new Date(), days), 'yyyy-MM-dd'), end }
}

function trafficRankWindow(
  range: TrafficRankRange,
  custom: { from: string; to: string },
): { start: number; end: number } {
  const end = Math.floor(Date.now() / 1000)
  if (range === 'custom') {
    const from = new Date(custom.from)
    const to = new Date(custom.to)
    to.setHours(23, 59, 59, 999)
    return { start: Math.floor(from.getTime() / 1000), end: Math.floor(to.getTime() / 1000) }
  }
  if (range === 'today') {
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    return { start: Math.floor(dayStart.getTime() / 1000), end }
  }
  const days = range === 'last7days' ? 7 : 30
  return { start: end - days * 86400, end }
}

export default function DashboardPage() {

  const { t } = useTranslation()
  const navigate = useNavigate()

  const [stats, setStats] = useState<DashboardStats>({})

  const [chartMode, setChartMode] = useState<'amount' | 'count'>('amount')

  const [chartData, setChartData] = useState<Array<Record<string, unknown>>>([])

  const [summary, setSummary] = useState<Record<string, unknown>>({})

  const [nodeRank, setNodeRank] = useState<unknown[]>([])

  const [userRank, setUserRank] = useState<unknown[]>([])

  const [nodeRankRange, setNodeRankRange] = useState<TrafficRankRange>('today')
  const [userRankRange, setUserRankRange] = useState<TrafficRankRange>('today')

  const [nodeRankLoading, setNodeRankLoading] = useState(true)
  const [userRankLoading, setUserRankLoading] = useState(true)

  const [queueStats, setQueueStats] = useState<QueueStats>({})

  const [failedJobsOpen, setFailedJobsOpen] = useState(false)

  const [failedJobDetail, setFailedJobDetail] = useState<HorizonFailedJob | null>(null)

  const [overviewRange, setOverviewRange] = useState<OverviewRange>('30d')
  const [overviewCustom, setOverviewCustom] = useState(() => ({
    from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  }))
  const [nodeRankCustom, setNodeRankCustom] = useState(() => ({
    from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  }))
  const [userRankCustom, setUserRankCustom] = useState(() => ({
    from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  }))



  useEffect(() => {
    void loadAdminCurrency()
  }, [])

  useEffect(() => {

    fetchDashboardStats()
      .then(setStats)
      .catch((e) => toastApiError(e, toast, t, t('common.error')))

    fetchQueueStats()
      .then(setQueueStats)
      .catch((e) => toastApiError(e, toast, t, t('common.error')))

    const timer = window.setInterval(() => {
      fetchDashboardStats()
        .then(setStats)
        .catch((e) => toastApiError(e, toast, t, t('common.error')))
      fetchQueueStats()
        .then(setQueueStats)
        .catch((e) => toastApiError(e, toast, t, t('common.error')))
    }, 60_000)

    return () => window.clearInterval(timer)

  }, [])



  useEffect(() => {
    const { start, end } = overviewWindow(overviewRange, overviewCustom)
    fetchOrderChart({ start_date: start, end_date: end })
      .then((d) => {
        setChartData(d.list)
        setSummary(d.summary)
      })
      .catch((e) => toastApiError(e, toast, t, t('common.error')))
  }, [overviewRange, overviewCustom, t])



  const loadNodeRank = useCallback(() => {
    const { start, end } = trafficRankWindow(nodeRankRange, nodeRankCustom)
    setNodeRankLoading(true)
    fetchTrafficRank('node', start, end)
      .then(setNodeRank)
      .catch((e) => {
        setNodeRank([])
        toastApiError(e, toast, t, t('common.error'))
      })
      .finally(() => setNodeRankLoading(false))
  }, [nodeRankRange, nodeRankCustom, t])

  const loadUserRank = useCallback(() => {
    const { start, end } = trafficRankWindow(userRankRange, userRankCustom)
    setUserRankLoading(true)
    fetchTrafficRank('user', start, end)
      .then(setUserRank)
      .catch((e) => {
        setUserRank([])
        toastApiError(e, toast, t, t('common.error'))
      })
      .finally(() => setUserRankLoading(false))
  }, [userRankRange, userRankCustom, t])

  useEffect(() => {
    loadNodeRank()
  }, [loadNodeRank])

  useEffect(() => {
    loadUserRank()
  }, [loadUserRank])



  const chartPoints = useMemo(

    () =>

      chartData.map((row) => ({

        date: String(row.date ?? ''),

        value: chartMode === 'amount' ? Number(row.paid_total ?? 0) : Number(row.paid_count ?? 0),

      })),

    [chartData, chartMode],

  )



  const paidCount = Number(summary.paid_count ?? 0)

  const paidTotal = Number(summary.paid_total ?? 0)

  const commissionCount = Number(summary.commission_count ?? 0)

  const commissionTotal = Number(summary.commission_total ?? 0)

  const avgOrder = paidCount > 0 ? paidTotal / paidCount : 0

  const commissionRate = paidTotal > 0 ? (commissionTotal / paidTotal) * 100 : 0

  return (

    <div className="grid gap-6">

      <SystemUpdateNotice />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

        <StatCard

          title={t('dashboard.stats.todayIncome')}

          value={formatMoney(stats.todayIncome)}

          growth={stats.dayIncomeGrowth}

          growthLabel={t('dashboard.stats.vsYesterday')}

          icon={ArrowDownToLine}

          iconClassName="text-emerald-500"

        />

        <StatCard

          title={t('dashboard.stats.monthlyIncome')}

          value={formatMoney(stats.currentMonthIncome)}

          growth={stats.monthIncomeGrowth}

          growthLabel={t('dashboard.stats.vsLastMonth')}

          icon={BarChart3}

          iconClassName="text-blue-500"

        />

        <StatCard

          title={t('dashboard.stats.pendingTickets')}

          value={String(stats.ticketPendingTotal ?? 0)}

          subtitle={

            (stats.ticketPendingTotal ?? 0) > 0

              ? t('dashboard.stats.hasPendingTickets')

              : t('dashboard.stats.noPendingTickets')

          }

          icon={MessageSquare}

          clickable

          onClick={() => navigate('/user/ticket')}

        />

        <StatCard

          title={t('dashboard.stats.pendingCommission')}

          value={String(stats.commissionPendingTotal ?? 0)}

          subtitle={

            (stats.commissionPendingTotal ?? 0) > 0

              ? t('dashboard.stats.hasPendingCommission')

              : t('dashboard.stats.noPendingCommission')

          }

          icon={Bell}

          iconClassName="text-amber-500"

          clickable

          onClick={() => {
            const params = new URLSearchParams()
            params.set('commission_status', '0')
            params.set('status', '3')
            params.set('commission_balance', 'gt:0')
            navigate(`/finance/order?${params.toString()}`)
          }}

        />

        <StatCard

          title={t('dashboard.stats.monthlyNewUsers')}

          value={String(stats.currentMonthNewUsers ?? 0)}

          growth={stats.userGrowth}

          growthLabel={t('dashboard.stats.vsLastMonth')}

          icon={Users}

          iconClassName="text-blue-500"

        />

        <StatCard

          title={t('dashboard.stats.totalUsers')}

          value={String(stats.totalUsers ?? 0)}

          subtitle={t('dashboard.stats.activeUsers', { count: stats.activeUsers ?? 0 })}

          icon={User}

          iconClassName="text-blue-500"

        />

        <StatCard

          title={t('dashboard.stats.monthlyUpload')}

          value={formatBytes(stats.monthTraffic?.upload)}

          subtitle={t('dashboard.stats.todayTraffic', {

            value: formatBytes(stats.todayTraffic?.upload),

          })}

          icon={Upload}

          iconClassName="text-emerald-500"

        />

        <StatCard

          title={t('dashboard.stats.monthlyDownload')}

          value={formatBytes(stats.monthTraffic?.download)}

          subtitle={t('dashboard.stats.todayTraffic', {

            value: formatBytes(stats.todayTraffic?.download),

          })}

          icon={ArrowDownToLine}

          iconClassName="text-blue-500"

        />

      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title={t('dashboard.stats.onlineUsers')}
          value={String(stats.onlineUsers ?? 0)}
          subtitle={t('dashboard.stats.onlineSnapshot')}
          icon={Wifi}
          iconClassName="text-emerald-500"
        />
        <StatCard
          title={t('dashboard.stats.onlineDevices')}
          value={String(stats.onlineDevices ?? 0)}
          subtitle={t('dashboard.stats.onlineSnapshot')}
          icon={MonitorSmartphone}
          iconClassName="text-blue-500"
        />
        <StatCard
          title={t('dashboard.stats.onlineNodes')}
          value={String(stats.onlineNodes ?? 0)}
          subtitle={t('dashboard.stats.onlineSnapshot')}
          icon={ServerCog}
          iconClassName="text-amber-500"
        />
      </div>

      <Card className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="flex flex-col space-y-1.5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold leading-none tracking-tight">{t('dashboard.overview.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {String(summary.start_date ?? '')} {t('dashboard.overview.to')} {String(summary.end_date ?? '')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FormSelect
                className="w-[120px] py-2"
                value={overviewRange}
                onChange={(v) => setOverviewRange(v as OverviewRange)}
                options={[
                  { value: '7d', label: t('dashboard.overview.last7Days') },
                  { value: '30d', label: t('dashboard.overview.last30Days') },
                  { value: '90d', label: t('dashboard.overview.last90Days') },
                  { value: '180d', label: t('dashboard.overview.last180Days') },
                  { value: '365d', label: t('dashboard.overview.lastYear') },
                  { value: 'custom', label: t('dashboard.overview.customRange') },
                ]}
              />
              {overviewRange === 'custom' && (
                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="date"
                    aria-label={t('dashboard.overview.selectDate')}
                    className="h-9 rounded-md border border-input bg-background px-2"
                    value={overviewCustom.from}
                    onChange={(e) => setOverviewCustom((c) => ({ ...c, from: e.target.value }))}
                  />
                  <span className="text-muted-foreground">{t('dashboard.overview.to')}</span>
                  <input
                    type="date"
                    aria-label={t('dashboard.overview.selectDate')}
                    className="h-9 rounded-md border border-input bg-background px-2"
                    value={overviewCustom.to}
                    onChange={(e) => setOverviewCustom((c) => ({ ...c, to: e.target.value }))}
                  />
                </div>
              )}
              <Tabs value={chartMode} onValueChange={(v) => setChartMode(v as 'amount' | 'count')}>
                <TabsList>
                  <TabsTrigger value="amount">{t('dashboard.overview.amount')}</TabsTrigger>
                  <TabsTrigger value="count">{t('dashboard.overview.count')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="xb-stack-1">
              <div className="text-sm text-muted-foreground">{t('dashboard.overview.totalIncome')}</div>
              <div className="text-2xl font-bold">{formatAdminMoneyFromMajor(paidTotal)}</div>
              <div className="text-xs text-muted-foreground">
                {t('dashboard.overview.totalTransactions', { count: paidCount })}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('dashboard.overview.avgOrderAmount')} {formatAdminMoneyFromMajor(avgOrder)}
              </div>
            </div>
            <div className="xb-stack-1">
              <div className="text-sm text-muted-foreground">{t('dashboard.overview.totalCommission')}</div>
              <div className="text-2xl font-bold">{formatAdminMoneyFromMajor(commissionTotal)}</div>
              <div className="text-xs text-muted-foreground">
                {t('dashboard.overview.totalTransactions', { count: commissionCount })}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('dashboard.overview.commissionRate')} {commissionRate.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartPoints} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--xb-primary)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="transparent" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" opacity={0.3} />
                <XAxis dataKey="date" hide />
                <YAxis hide width={60} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--xb-primary)"
                  fill="url(#incomeGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>



      <div className="grid gap-4 lg:grid-cols-2">

        <RankCard
          title={t('dashboard.trafficRank.nodeTrafficRank')}
          variant="node"
          rows={nodeRank}
          loading={nodeRankLoading}
          range={nodeRankRange}
          onRangeChange={setNodeRankRange}
          customRange={nodeRankCustom}
          onCustomRangeChange={setNodeRankCustom}
        />

        <RankCard
          title={t('dashboard.trafficRank.userTrafficRank')}
          variant="user"
          rows={userRank}
          loading={userRankLoading}
          range={userRankRange}
          onRangeChange={setUserRankRange}
          customRange={userRankCustom}
          onCustomRangeChange={setUserRankCustom}
        />

      </div>



      <div className="grid gap-4 lg:grid-cols-2">

        <QueueStatusCard stats={queueStats} />

        <QueueDetailsCard stats={queueStats} onViewFailedJobs={() => setFailedJobsOpen(true)} />

      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SystemStatusPanel />
        <QueueWorkloadPanel />
      </div>

      <AuditLogPanel />

      {/* 7001 legacy dashboard has no system-status / queue-workload / audit-log sections below. */}

      <FailedJobsDialog
        open={failedJobsOpen}
        onOpenChange={setFailedJobsOpen}
        onViewDetail={(job) => {
          setFailedJobsOpen(false)
          setFailedJobDetail(job)
        }}
      />

      <FailedJobDetailDialog job={failedJobDetail} onOpenChange={(open) => !open && setFailedJobDetail(null)} />

    </div>

  )

}



function RankCard({
  title,
  variant = 'node',
  rows,
  loading,
  range,
  onRangeChange,
  customRange,
  onCustomRangeChange,
}: {
  title: string
  variant?: 'node' | 'user'
  rows: unknown[]
  loading?: boolean
  range: TrafficRankRange
  onRangeChange: (range: TrafficRankRange) => void
  customRange: { from: string; to: string }
  onCustomRangeChange: (range: { from: string; to: string }) => void
}) {

  const { t } = useTranslation()

  return (

    <Card className="rounded-xl shadow">

      <CardHeader className="flex flex-row items-center justify-between space-y-0">

        <CardTitle className="text-base font-semibold">{title}</CardTitle>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative">
            <select
              aria-label={t('dashboard.trafficRank.selectTimeRange')}
              className="h-8 appearance-none rounded-md border border-input bg-background py-1 pl-3 pr-8 text-xs"
              value={range}
              onChange={(e) => onRangeChange(e.target.value as TrafficRankRange)}
            >
              <option value="today">{t('dashboard.trafficRank.today')}</option>
              <option value="last7days">{t('dashboard.trafficRank.last7days')}</option>
              <option value="last30days">{t('dashboard.trafficRank.last30days')}</option>
              <option value="custom">{t('dashboard.trafficRank.customRange')}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          </div>
          {range === 'custom' && (
            <div className="flex items-center gap-1 text-xs">
              <input
                type="date"
                aria-label={t('dashboard.trafficRank.selectDateRange')}
                className="h-8 rounded-md border border-input bg-background px-2"
                value={customRange.from}
                onChange={(e) => onCustomRangeChange({ ...customRange, from: e.target.value })}
              />
              <span className="text-muted-foreground">-</span>
              <input
                type="date"
                aria-label={t('dashboard.trafficRank.selectDateRange')}
                className="h-8 rounded-md border border-input bg-background px-2"
                value={customRange.to}
                onChange={(e) => onCustomRangeChange({ ...customRange, to: e.target.value })}
              />
            </div>
          )}
        </div>

      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex h-[400px] flex-col">
          <div className="grid grid-cols-[48px_1fr_auto] gap-2 border-b px-2 pb-2 text-xs font-medium text-muted-foreground">
            <span>{t('dashboard.traffic.rank')}</span>
            <span>{variant === 'user' ? t('user.columns.email') : t('dashboard.traffic.domain')}</span>
            <span>{t('dashboard.trafficRank.currentTraffic')}</span>
          </div>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="animate-pulse">{t('common.loading')}</div>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                {t('common.table.noData')}
              </div>
            ) : (
              <div className="divide-y">
                {rows.slice(0, 10).map((row, i) => {
                  const r = row as Record<string, unknown>
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[48px_1fr_auto] gap-2 px-2 py-2.5 text-sm"
                    >
                      <span>{i + 1}</span>
                      <span className="truncate">{String(r.name ?? r.email ?? r.server_name ?? '-')}</span>
                      <span className="text-right">{formatBytes(Number(r.value ?? r.total ?? r.traffic ?? 0))}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>

    </Card>

  )

}



function QueueStatusCard({ stats }: { stats: QueueStats }) {

  const { t } = useTranslation()

  const normal = stats.status !== false

  const recentJobs = stats.recentJobs ?? 0

  const jobsPerMinute = stats.jobsPerMinute ?? 0

  return (

    <Card className="rounded-xl shadow">

      <CardHeader>

        <CardTitle className="text-base font-semibold">{t('dashboard.queue.title')}</CardTitle>

        <p className="text-sm text-muted-foreground">{t('dashboard.queue.status.description')}</p>

      </CardHeader>

      <CardContent className="xb-stack-4 text-sm">

        <div className="flex items-center justify-between">

          <span className="text-muted-foreground">{t('dashboard.queue.status.running')}</span>

          <span className={normal ? 'text-emerald-600' : 'text-red-600'}>

            {normal ? t('dashboard.queue.status.normal') : t('dashboard.queue.status.abnormal')}

          </span>

        </div>

        <div className="xb-stack-1">

          <div className="flex items-center justify-between">

            <span className="text-muted-foreground">{t('dashboard.queue.details.recentJobs')}</span>

            <span>{recentJobs}</span>

          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">

            <div className="h-full bg-primary" style={{ width: `${Math.min(recentJobs * 10, 100)}%` }} />

          </div>

        </div>

        <div className="xb-stack-1">

          <div className="flex items-center justify-between">

            <span className="text-muted-foreground">{t('dashboard.queue.details.jobsPerMinute')}</span>

            <span>{jobsPerMinute}</span>

          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">

            <div className="h-full bg-primary" style={{ width: `${Math.min(jobsPerMinute * 10, 100)}%` }} />

          </div>

        </div>

      </CardContent>

    </Card>

  )

}



function QueueDetailsCard({
  stats,
  onViewFailedJobs,
}: {
  stats: QueueStats
  onViewFailedJobs: () => void
}) {

  const { t } = useTranslation()

  const processes = stats.processes ?? 0

  const failed = stats.failedJobs ?? 0

  return (

    <Card className="rounded-xl shadow">

      <CardHeader>

        <CardTitle className="text-base font-semibold">{t('dashboard.queue.jobDetails')}</CardTitle>

        <p className="text-sm text-muted-foreground">{t('dashboard.queue.details.description')}</p>

      </CardHeader>

      <CardContent className="xb-stack-4 text-sm">

        <div className="xb-stack-2 rounded-lg bg-muted/50 p-3">

          <p className="text-muted-foreground">{t('dashboard.queue.details.failedJobs7Days')}</p>

          <div className="flex items-center gap-2">

            <span
              role="button"
              tabIndex={0}
              className="cursor-pointer text-2xl font-bold text-destructive hover:underline"
              title={t('dashboard.queue.details.viewFailedJobs')}
              style={{ userSelect: 'none' }}
              onClick={onViewFailedJobs}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onViewFailedJobs()
                }
              }}
            >
              {failed}
            </span>

            <Eye
              className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
              onClick={onViewFailedJobs}
              aria-label={t('dashboard.queue.details.viewFailedJobs')}
            />

          </div>

        </div>

        <div className="flex items-center justify-between">

          <span className="text-muted-foreground">{t('dashboard.queue.details.longestRunningQueue')}</span>

          <span>{stats.queueWithMaxRuntime ?? '0s'}</span>

        </div>

        <div className="xb-stack-1">

          <div className="flex items-center justify-between">

            <span className="text-muted-foreground">{t('dashboard.queue.details.activeProcesses')}</span>

            <span>{processes}</span>

          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">

            <div className="h-full bg-primary" style={{ width: processes > 0 ? '100%' : '0%' }} />

          </div>

        </div>

      </CardContent>

    </Card>

  )

}



function FailedJobsDialog({
  open,
  onOpenChange,
  onViewDetail,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewDetail: (job: HorizonFailedJob) => void
}) {

  const { t } = useTranslation()

  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<HorizonFailedJob[]>([])

  const [total, setTotal] = useState(0)

  const [loading, setLoading] = useState(false)

  const pageSize = 20

  const load = useCallback(() => {

    setLoading(true)

    fetchHorizonFailedJobs(page, pageSize)

      .then((res) => {

        setRows(res.data)

        setTotal(res.total)

      })

      .catch((e) => {
        setRows([])
        setTotal(0)
        toastApiError(e, toast, t, t('common.error'))
      })

      .finally(() => setLoading(false))

  }, [page, pageSize, t])



  useEffect(() => {

    if (!open) {
      setPage(1)
      return
    }

    load()

  }, [open, load])



  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (

    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">

        <DialogHeader>

          <DialogTitle>{t('dashboard.queue.details.failedJobsDetailTitle')}</DialogTitle>

        </DialogHeader>

        <div className="overflow-x-auto">

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>{t('dashboard.queue.details.time')}</TableHead>

                <TableHead>{t('dashboard.queue.details.queue')}</TableHead>

                <TableHead>{t('dashboard.queue.details.name')}</TableHead>

                <TableHead>{t('dashboard.queue.details.exception')}</TableHead>

                <TableHead className="w-16">{t('dashboard.queue.details.action')}</TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {loading ? (

                <TableRow>

                  <TableCell colSpan={5} className="text-center text-muted-foreground">

                    {t('common.loading')}

                  </TableCell>

                </TableRow>

              ) : rows.length === 0 ? (

                <TableRow>

                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">

                    {t('dashboard.queue.details.noFailedJobs')}

                  </TableCell>

                </TableRow>

              ) : (

                rows.map((row) => (

                  <TableRow key={row.id ?? row.uuid}>

                    <TableCell className="whitespace-nowrap">{formatFailedAt(row.failed_at)}</TableCell>

                    <TableCell>{row.queue ?? '—'}</TableCell>

                    <TableCell className="max-w-[150px] truncate" title={row.name}>

                      {row.name ?? '—'}

                    </TableCell>

                    <TableCell className="max-w-[200px] truncate" title={row.exception}>

                      {row.exception?.split('\n')[0] ?? '—'}

                    </TableCell>

                    <TableCell>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onViewDetail(row)}
                        aria-label={t('dashboard.queue.details.viewDetail')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                    </TableCell>

                  </TableRow>

                ))

              )}

            </TableBody>

          </Table>

        </div>

        {pageCount > 1 ? (

          <div className="flex items-center justify-between text-sm text-muted-foreground">

            <span>

              {t('dashboard.common.pagination', {

                current: page,

                total: pageCount,

                count: total,

              })}

            </span>

            <div className="flex gap-2">

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('common.table.pagination.previousPage')}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('common.table.pagination.nextPage')}
              </Button>

            </div>

          </div>

        ) : null}

        <DialogFooter>

          <Button type="button" variant="outline" onClick={load} disabled={loading}>

            <RefreshCw className="mr-2 h-4 w-4" />

            {t('dashboard.common.refresh')}

          </Button>

          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>

            {t('common.close')}

          </Button>

        </DialogFooter>

      </DialogContent>

    </Dialog>

  )

}



function FailedJobDetailDialog({
  job,
  onOpenChange,
}: {
  job: HorizonFailedJob | null
  onOpenChange: (open: boolean) => void
}) {

  const { t } = useTranslation()

  return (

    <Dialog open={job != null} onOpenChange={onOpenChange}>

      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">

        <DialogHeader>

          <DialogTitle>{t('dashboard.queue.details.jobDetailTitle')}</DialogTitle>

        </DialogHeader>

        {job ? (

          <div className="xb-stack-gap text-sm">

            <div className="grid grid-cols-2 gap-4">

              <div className="xb-stack-2">

                <h3 className="font-medium text-muted-foreground">{t('dashboard.queue.details.id')}</h3>

                <p className="break-all rounded-md bg-muted/50 p-2">{job.id ?? job.uuid ?? '—'}</p>

              </div>

              <div className="xb-stack-2">

                <h3 className="font-medium text-muted-foreground">{t('dashboard.queue.details.time')}</h3>

                <p className="rounded-md bg-muted/50 p-2">{formatFailedAt(job.failed_at)}</p>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-4">

              <div className="xb-stack-2">

                <h3 className="font-medium text-muted-foreground">{t('dashboard.queue.details.queue')}</h3>

                <p className="rounded-md bg-muted/50 p-2">{job.queue ?? '—'}</p>

              </div>

              <div className="xb-stack-2">

                <h3 className="font-medium text-muted-foreground">{t('dashboard.queue.details.connection')}</h3>

                <p className="rounded-md bg-muted/50 p-2">{job.connection ?? '—'}</p>

              </div>

            </div>

            <div className="xb-stack-2">

              <h3 className="font-medium text-muted-foreground">{t('dashboard.queue.details.name')}</h3>

              <p className="break-all rounded-md bg-muted/50 p-2">{job.name ?? '—'}</p>

            </div>

            <div className="xb-stack-2">

              <h3 className="font-medium text-muted-foreground">{t('dashboard.queue.details.exception')}</h3>

              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs">

                {job.exception ?? '—'}

              </pre>

            </div>

            <div className="xb-stack-2">

              <h3 className="font-medium text-muted-foreground">{t('dashboard.queue.details.payload')}</h3>

              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs">

                {job.payload ?? '—'}

              </pre>

            </div>

          </div>

        ) : null}

        <DialogFooter>

          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>

            {t('common.close')}

          </Button>

        </DialogFooter>

      </DialogContent>

    </Dialog>

  )

}


