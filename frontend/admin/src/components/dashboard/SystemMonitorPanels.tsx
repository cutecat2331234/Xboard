import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Activity, Clock, Layers, RefreshCw, Server } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  fetchAuditLog,
  fetchQueueWorkload,
  fetchSystemStatus,
  type AuditLogRow,
  type QueueWorkloadItem,
  type SystemStatus,
} from '@/lib/api'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function formatTs(ts?: number | null) {
  if (!ts) return '—'
  const d = new Date(ts * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function statusLabel(t: (key: string) => string, ok?: boolean) {
  return ok ? t('dashboard.queue.status.normal') : t('dashboard.queue.status.abnormal')
}

export function SystemStatusPanel() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<SystemStatus>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetchSystemStatus()
      .then(setStatus)
      .catch(() => setStatus({}))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{t('dashboard.systemStatus.title')}</h3>
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('dashboard.common.refresh')}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title={t('dashboard.systemStatus.schedule')}
          value={loading ? '…' : statusLabel(t, status.schedule)}
          subtitle={t('dashboard.systemStatus.scheduleLastRun', {
            time: formatTs(status.schedule_last_runtime),
          })}
          icon={Clock}
          iconClassName={status.schedule ? 'text-emerald-500' : 'text-red-500'}
        />
        <StatCard
          title={t('dashboard.systemStatus.horizon')}
          value={loading ? '…' : statusLabel(t, status.horizon)}
          subtitle={t('dashboard.systemStatus.horizonHint')}
          icon={Server}
          iconClassName={status.horizon ? 'text-emerald-500' : 'text-red-500'}
        />
      </div>
    </div>
  )
}

export function QueueWorkloadPanel() {
  const { t } = useTranslation()
  const [items, setItems] = useState<QueueWorkloadItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetchQueueWorkload()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Card className="rounded-xl shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">{t('dashboard.queueWorkload.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('dashboard.queueWorkload.description')}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('dashboard.common.refresh')}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.queueWorkload.empty')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <StatCard
                key={item.name ?? String(item.length)}
                title={item.name ?? '—'}
                value={String(item.length ?? 0)}
                subtitle={t('dashboard.queueWorkload.summary', {
                  wait: item.wait ?? 0,
                  processes: item.processes ?? 0,
                })}
                icon={Layers}
                iconClassName="text-blue-500"
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AuditLogPanel() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const pageSize = 10

  const load = useCallback(() => {
    setLoading(true)
    fetchAuditLog({ current: page, page_size: pageSize, keyword: search || undefined })
      .then((res) => {
        setRows(res.data)
        setTotal(res.total)
      })
      .catch(() => {
        setRows([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => {
    load()
  }, [load])

  const columns = useMemo<ColumnDef<AuditLogRow>[]>(
    () => [
      {
        accessorKey: 'id',
        header: t('dashboard.auditLog.columns.id'),
        cell: ({ row }) => row.original.id ?? '—',
      },
      {
        id: 'admin',
        header: t('dashboard.auditLog.columns.admin'),
        cell: ({ row }) => row.original.admin?.email ?? row.original.admin_id ?? '—',
      },
      {
        accessorKey: 'action',
        header: t('dashboard.auditLog.columns.action'),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.action ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'method',
        header: t('dashboard.auditLog.columns.method'),
        cell: ({ row }) => row.original.method ?? '—',
      },
      {
        accessorKey: 'uri',
        header: t('dashboard.auditLog.columns.uri'),
        cell: ({ row }) => (
          <span className="block max-w-[240px] truncate" title={row.original.uri}>
            {row.original.uri ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'ip',
        header: t('dashboard.auditLog.columns.ip'),
        cell: ({ row }) => row.original.ip ?? '—',
      },
      {
        accessorKey: 'created_at',
        header: t('dashboard.auditLog.columns.time'),
        cell: ({ row }) => formatTs(row.original.created_at),
      },
    ],
    [t],
  )

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (
    <Card className="rounded-xl shadow">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4" />
            {t('dashboard.auditLog.title')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('dashboard.auditLog.description')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('dashboard.auditLog.keywordPlaceholder')}
            className="h-8 w-full min-w-[200px] sm:w-64"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1)
                setSearch(keyword.trim())
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              setPage(1)
              setSearch(keyword.trim())
            }}
          >
            {t('common.search')}
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('dashboard.common.refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          pageSize={pageSize}
          alwaysShowPagination
          totalItems={total}
          pageIndex={page - 1}
          pageCount={pageCount}
          onPageIndexChange={(idx) => setPage(idx + 1)}
        />
      </CardContent>
    </Card>
  )
}
