import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { adminApi, fetchJsonObject } from '@/lib/api'
import { toastApiError } from '@/lib/api-errors'
import { formatAdminDateTime } from '@/lib/format-datetime'
import { DataTable } from '@/components/shared/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type TrafficResetLogRow = {
  id: number
  user_email?: string
  reset_type_name?: string
  trigger_source_name?: string
  old_traffic?: { formatted?: string }
  new_traffic?: { formatted?: string }
  reset_time?: number
}

type TrafficResetStats = {
  total_resets?: number
  auto_resets?: number
  manual_resets?: number
  cron_resets?: number
  order_resets?: number
  gift_card_resets?: number
}

export default function TrafficResetPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('logs')
  const [logs, setLogs] = useState<TrafficResetLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [emailFilter, setEmailFilter] = useState('')
  const [stats, setStats] = useState<TrafficResetStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const loadLogs = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), per_page: '20' })
    if (emailFilter.trim()) params.set('user_email', emailFilter.trim())
    adminApi<{ data: TrafficResetLogRow[]; pagination: { total: number } }>(
      `/traffic-reset/logs?${params}`,
    )
      .then((res) => {
        setLogs(res.data ?? [])
        setTotal(res.pagination?.total ?? 0)
      })
      .catch((e) => toastApiError(e, toast, t, t('common.error')))
      .finally(() => setLoading(false))
  }, [page, emailFilter, t])

  const loadStats = useCallback(() => {
    setStatsLoading(true)
    fetchJsonObject<TrafficResetStats>('/traffic-reset/stats?days=30')
      .then(setStats)
      .catch((e) => toastApiError(e, toast, t, t('common.error')))
      .finally(() => setStatsLoading(false))
  }, [t])

  useEffect(() => {
    if (tab === 'logs') loadLogs()
  }, [tab, loadLogs])

  useEffect(() => {
    if (tab === 'stats') loadStats()
  }, [tab, loadStats])

  const columns = useMemo<ColumnDef<TrafficResetLogRow, unknown>[]>(
    () => [
      { accessorKey: 'id', header: t('user.traffic_reset_logs.columns.id') },
      { accessorKey: 'user_email', header: t('user.traffic_reset_logs.columns.user') },
      { accessorKey: 'reset_type_name', header: t('user.traffic_reset_logs.columns.reset_type') },
      { accessorKey: 'trigger_source_name', header: t('user.traffic_reset_logs.columns.trigger_source') },
      {
        id: 'cleared',
        header: t('user.traffic_reset_logs.columns.cleared_traffic'),
        cell: ({ row }) => row.original.old_traffic?.formatted ?? '—',
      },
      {
        id: 'reset_time',
        header: t('user.traffic_reset_logs.columns.reset_time'),
        cell: ({ row }) =>
          row.original.reset_time
            ? formatAdminDateTime(row.original.reset_time)
            : '—',
      },
    ],
    [t],
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('user.traffic_reset_logs.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('user.traffic_reset_logs.description')}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="logs">{t('user.traffic_reset_logs.title')}</TabsTrigger>
          <TabsTrigger value="stats">{t('user.traffic_reset.stats.title')}</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder={t('user.traffic_reset_logs.filters.search_user')}
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), loadLogs())}
            />
            <Button variant="secondary" onClick={() => (setPage(1), loadLogs())}>
              {t('common.search')}
            </Button>
          </div>
          <DataTable columns={columns} data={logs} loading={loading} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{t('user.traffic_reset_logs.pagination.total', { total })}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {t('common.table.pagination.previousPage')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('common.table.pagination.nextPage')}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          {statsLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ['total_resets', t('user.traffic_reset.stats.total_resets')],
                  ['manual_resets', t('user.traffic_reset.stats.manual_resets')],
                  ['cron_resets', t('user.traffic_reset.stats.cron_resets')],
                  ['auto_resets', t('user.traffic_reset.stats.auto_resets')],
                  ['order_resets', t('user.traffic_reset.stats.order_resets')],
                  ['gift_card_resets', t('user.traffic_reset.stats.gift_card_resets')],
                ] as const
              ).map(([key, label]) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{stats?.[key] ?? 0}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('user.traffic_reset.stats.in_period', { days: 30 })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
