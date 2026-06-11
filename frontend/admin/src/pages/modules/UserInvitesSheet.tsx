import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { adminApi, type PaginatedResult } from '@/lib/api'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type InvitedUserRow = {
  id?: number
  email?: string
  created_at?: number
  plan_id?: number | null
  balance?: number
  expired_at?: number | null
}

type PlanRow = { id?: number; name?: string }

function formatTs(ts?: number | null) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString()
}

type Props = {
  userId?: number
  email?: string
  plans: PlanRow[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserInvitesSheet({ userId, email, plans, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [data, setData] = useState<InvitedUserRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const pageSize = 10

  const load = useCallback(() => {
    if (!userId || !open) return
    setLoading(true)
    adminApi<PaginatedResult<InvitedUserRow>>('/user/fetch', {
      method: 'POST',
      body: JSON.stringify({
        current: page,
        pageSize,
        filter: [{ id: 'invite_user_id', value: `eq:${userId}` }],
      }),
    })
      .then((res) => {
        setData(Array.isArray(res.data) ? res.data : [])
        setTotal(res.total ?? 0)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
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

  const columns = useMemo<ColumnDef<InvitedUserRow, unknown>[]>(
    () => [
      {
        accessorKey: 'id',
        header: () => t('user.columns.id'),
      },
      {
        accessorKey: 'email',
        header: () => t('user.columns.email'),
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
        accessorKey: 'created_at',
        header: () => t('user.columns.register_time'),
        cell: ({ row }) => formatTs(row.original.created_at),
      },
    ],
    [t, plans],
  )

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-auto p-6 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {t('user.columns.actions_menu.invites')}
          </SheetTitle>
        </SheetHeader>
        {email ? (
          <p className="text-sm text-muted-foreground">
            {t('user.dialog.inviteInfo')}: {email}
          </p>
        ) : null}
        {!loading && data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('user.filter.no_results')}
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
        <SheetFooter className="mt-auto flex-row justify-end gap-2 border-0 p-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
