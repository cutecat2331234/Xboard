import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/api-errors'
import { fetchPaginatedList } from '@/lib/api'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type TrafficRecordRow = {
  id?: number
  user_id?: number
  u?: number
  d?: number
  server_rate?: number | string
  record_at?: number
}

function formatBytes(n?: number) {
  if (!n) return '0 B'
  const gb = n / 1073741824
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  const mb = n / 1048576
  if (mb >= 1) return `${mb.toFixed(2)} MB`
  const kb = n / 1024
  return `${kb.toFixed(2)} KB`
}

function formatTs(ts?: number | null) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString()
}

type Props = {
  userId?: number
  email?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserTrafficRecordsDialog({ userId, email, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<TrafficRecordRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const pageSize = 20

  const load = useCallback(() => {
    if (!userId || !open) return
    setLoading(true)
    fetchPaginatedList<TrafficRecordRow>('/stat/getStatUser', {
      user_id: userId,
      pageSize,
      page,
    })
      .then((res) => {
        setData(Array.isArray(res.data) ? res.data : [])
        setTotal(res.total ?? 0)
      })
      .catch((e) => toastApiError(e, toast, t, t('common.error')))
      .finally(() => setLoading(false))
  }, [userId, open, page, pageSize, t])

  useEffect(() => {
    if (!open) {
      setPage(1)
      setData([])
      setTotal(0)
      return
    }
    load()
  }, [open, load])

  const columns = useMemo<ColumnDef<TrafficRecordRow, unknown>[]>(
    () => [
      {
        accessorKey: 'record_at',
        header: () => t('traffic.trafficRecord.time'),
        cell: ({ row }) => formatTs(row.original.record_at),
      },
      {
        accessorKey: 'u',
        header: () => t('traffic.trafficRecord.upload'),
        cell: ({ row }) => {
          const rate = Number(row.original.server_rate) || 1
          return formatBytes((row.original.u ?? 0) / rate)
        },
      },
      {
        accessorKey: 'd',
        header: () => t('traffic.trafficRecord.download'),
        cell: ({ row }) => {
          const rate = Number(row.original.server_rate) || 1
          return formatBytes((row.original.d ?? 0) / rate)
        },
      },
      {
        accessorKey: 'server_rate',
        header: () => t('traffic.trafficRecord.rate'),
        cell: ({ row }) =>
          t('traffic.trafficRecord.multiplier', { value: row.original.server_rate ?? 1 }),
      },
      {
        id: 'total',
        header: () => t('traffic.trafficRecord.total'),
        cell: ({ row }) => {
          const rate = Number(row.original.server_rate) || 1
          return formatBytes(((row.original.u ?? 0) + (row.original.d ?? 0)) / rate)
        },
      },
    ],
    [t],
  )

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('traffic.trafficRecord.title')}</DialogTitle>
        </DialogHeader>
        {email ? <p className="text-sm text-muted-foreground">{email}</p> : null}
        {!loading && data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('traffic.trafficRecord.noRecords')}
          </p>
        ) : (
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
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
