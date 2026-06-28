import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { IconDots } from '@tabler/icons-react'
import { MessageSquare, Plus, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/api-errors'
import { formatAdminDateTime } from '@/lib/format-datetime'
import {
  adminApi,
  buildQuery,
  dropTicketType,
  fetchTicketTypes,
  postJson,
  saveTicketType,
  type PaginatedResult,
  type TicketType,
} from '@/lib/api'
import { inputCls, textareaCls } from '@/lib/form-styles'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { useInFlightGuard } from '@/lib/use-in-flight-guard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type TicketRow = {
  id?: number
  subject?: string
  level?: number
  status?: number
  reply_status?: number
  updated_at?: number
  created_at?: number
  ticket_type_id?: number | null
  ticket_type?: { id?: number; name?: string } | null
}

type TicketMessage = {
  id?: number
  message?: string
  is_me?: boolean
  is_from_user?: boolean
  is_from_admin?: boolean
  created_at?: number
}

type TicketDetail = TicketRow & {
  messages?: TicketMessage[]
  user?: { email?: string }
}

function normalizeTicketDetail(raw: TicketDetail | null | undefined): TicketDetail | null {
  if (!raw) return null
  return {
    ...raw,
    messages: (raw.messages ?? []).map((msg) => ({
      ...msg,
      is_me: Boolean(msg.is_from_admin ?? !msg.is_from_user),
    })),
  }
}

function statusLabel(t: (key: string) => string, status?: number) {
  if (status === 1) return t('ticket.status.closed')
  if (status === 0) return t('ticket.status.processing')
  return String(status ?? '—')
}

function replyStatusLabel(
  t: (key: string) => string,
  replyStatus?: number,
) {
  if (replyStatus === 0) return t('ticket.status.pending')
  if (replyStatus === 1) return t('ticket.status.replied')
  return String(replyStatus ?? '—')
}

function isOfficialWithdrawTicket(row: TicketRow): boolean {
  return Number(row.level) === 2 && Boolean(row.subject?.includes('[withdraw_ticket]'))
}

function isWithdrawTicketRow(row: TicketRow): boolean {
  return isOfficialWithdrawTicket(row) || isLegacyWithdrawTicket(row)
}

function isLegacyWithdrawTicket(row: TicketRow): boolean {
  if (Number(row.level) !== 2 || isOfficialWithdrawTicket(row)) {
    return false
  }
  const subject = row.subject ?? ''
  return (
    subject.includes('Commission Withdrawal Request')
    || subject.includes('Commission withdrawal')
    || subject.includes('佣金提现')
  )
}

function levelLabel(t: (key: string) => string, level?: number, subject?: string) {
  if (level === 2 && isWithdrawTicketRow({ level, subject })) {
    return t('ticket.level.withdraw')
  }
  if (level === 0) return t('ticket.level.low')
  if (level === 1) return t('ticket.level.medium')
  if (level === 2) return t('ticket.level.high')
  return String(level ?? '—')
}

export default function TicketPage() {
  const { t } = useTranslation()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const runGuarded = useInFlightGuard()
  const [data, setData] = useState<TicketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState<'open' | 'closed'>('open')
  const [replyStatusFilter, setReplyStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])

  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)

  const [typesDialogOpen, setTypesDialogOpen] = useState(false)
  const [typeEditing, setTypeEditing] = useState<TicketType | null>(null)
  const [typeForm, setTypeForm] = useState<{ name: string; sort: string; show: boolean }>({
    name: '',
    sort: '0',
    show: true,
  })
  const [typeSaving, setTypeSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const body: Record<string, unknown> = {
      current: page,
      pageSize,
    }
    if (search.trim()) body.email = search.trim()
    body.status = statusTab === 'closed' ? 1 : 0
    if (replyStatusFilter !== '') body.reply_status = [Number(replyStatusFilter)]
    if (typeFilter !== '') body.ticket_type_id = Number(typeFilter)

    adminApi<PaginatedResult<TicketRow>>('/ticket/fetch', {
      method: 'POST',
      body: JSON.stringify(body),
    })
      .then((res) => {
        setData(Array.isArray(res.data) ? res.data : [])
        setTotal(res.total ?? 0)
      })
      .catch((e) => toastApiError(e, toast, t, t('common.error')))
      .finally(() => setLoading(false))
  }, [page, pageSize, search, statusTab, replyStatusFilter, typeFilter, t])

  const loadTypes = useCallback(() => {
    fetchTicketTypes()
      .then((rows) => setTicketTypes(rows))
      .catch((e) => toastApiError(e, toast, t, t('common.error')))
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadTypes()
  }, [loadTypes])

  useEffect(() => {
    if (!detailOpen || !detail?.id || detail.status === 1) return
    const ticketId = detail.id
    const timer = window.setInterval(() => {
      adminApi<{ data?: TicketDetail }>(`/ticket/fetch${buildQuery({ id: ticketId })}`)
        .then((result) => {
          setDetail(normalizeTicketDetail(result.data ?? null))
        })
        .catch(() => {
          /* ignore polling errors */
        })
    }, 3000)
    return () => window.clearInterval(timer)
  }, [detailOpen, detail?.id, detail?.status])

  async function openDetail(row: TicketRow) {
    try {
      const result = await adminApi<{ data?: TicketDetail }>(
        `/ticket/fetch${buildQuery({ id: row.id })}`,
      )
      setDetail(normalizeTicketDetail(result.data ?? null))
      setReply('')
      setDetailOpen(true)
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    }
  }

  async function sendReply() {
    if (!detail?.id || !reply.trim()) return
    setSaving(true)
    try {
      await postJson('/ticket/reply', { id: detail.id, message: reply })
      toast.success(t('common.success'))
      const result = await adminApi<{ data?: TicketDetail }>(
        `/ticket/fetch${buildQuery({ id: detail.id })}`,
      )
      setDetail(normalizeTicketDetail(result.data ?? null))
      setReply('')
      load()
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function closeTicket(
    row: TicketRow,
    options?: { withdrawPaid?: boolean; withdrawRejected?: boolean },
  ) {
    // Guard the whole flow (confirm + request) so a rapid second click on
    // approve/reject withdrawal cannot dispatch a duplicate money-changing call.
    await runGuarded(`close:${row.id}`, async () => {
      const needsConfirm = isOfficialWithdrawTicket(row) || isLegacyWithdrawTicket(row)
      if (needsConfirm) {
        const title = options?.withdrawPaid
          ? t('ticket.actions.approve_withdraw_confirm_title')
          : t('ticket.actions.reject_withdraw_confirm_title')
        const description = options?.withdrawPaid
          ? t('ticket.actions.approve_withdraw_confirm_description')
          : t('ticket.actions.reject_withdraw_confirm_description')
        if (!(await confirm(title, description, { destructive: !options?.withdrawPaid }))) {
          return
        }
      } else if (!(await confirm(
        t('ticket.actions.close_confirm_title'),
        t('ticket.actions.close_confirm_description'),
      ))) {
        return
      }
      try {
        const payload: Record<string, unknown> = { id: row.id }
        if (options?.withdrawPaid) {
          payload.withdraw_paid = true
        }
        if (options?.withdrawRejected) {
          payload.withdraw_rejected = true
        }
        await postJson('/ticket/close', payload)
        toast.success(t('common.success'))
        load()
      } catch (e) {
        toastApiError(e, toast, t, t('common.error'))
      }
    })
  }

  function openTypeCreate() {
    setTypeEditing(null)
    setTypeForm({ name: '', sort: '0', show: true })
  }

  function openTypeEdit(row: TicketType) {
    setTypeEditing(row)
    setTypeForm({
      name: row.name ?? '',
      sort: String(row.sort ?? 0),
      show: Boolean(row.show),
    })
  }

  async function saveType() {
    const name = typeForm.name.trim()
    if (!name) {
      toast.error(t('ticket.types.form.name_required'))
      return
    }
    setTypeSaving(true)
    try {
      await saveTicketType({
        id: typeEditing?.id,
        name,
        sort: Number(typeForm.sort) || 0,
        show: typeForm.show,
      })
      toast.success(t('common.success'))
      openTypeCreate()
      loadTypes()
      load()
    } catch (e) {
      toastApiError(e, toast, t, t('common.error'))
    } finally {
      setTypeSaving(false)
    }
  }

  async function deleteType(row: TicketType) {
    if (row.id == null) return
    await runGuarded(`type-delete:${row.id}`, async () => {
      if (
        !(await confirm(
          t('ticket.types.delete.title'),
          t('ticket.types.delete.description'),
        ))
      )
        return
      try {
        await dropTicketType(row.id as number)
        toast.success(t('common.success'))
        if (typeEditing?.id === row.id) openTypeCreate()
        if (typeFilter === String(row.id)) {
          setTypeFilter('')
          setPage(1)
        }
        loadTypes()
        load()
      } catch (e) {
        toastApiError(e, toast, t, t('common.error'))
      }
    })
  }

  const columns = useMemo<ColumnDef<TicketRow, unknown>[]>(
    () => [
      { accessorKey: 'id', header: () => t('ticket.columns.id') },
      { accessorKey: 'subject', header: () => t('ticket.columns.subject') },
      {
        id: 'ticket_type',
        header: () => t('ticket.columns.type'),
        cell: ({ row }) => row.original.ticket_type?.name ?? '—',
      },
      { accessorKey: 'level', header: () => t('ticket.columns.level'), cell: ({ row }) => levelLabel(t, row.original.level, row.original.subject) },
      {
        accessorKey: 'status',
        header: () => t('ticket.columns.status'),
        cell: ({ row }) => statusLabel(t, row.original.status),
      },
      {
        accessorKey: 'reply_status',
        header: () => t('ticket.columns.reply_status'),
        cell: ({ row }) => replyStatusLabel(t, row.original.reply_status),
      },
      {
        accessorKey: 'updated_at',
        header: () => t('ticket.columns.updated_at'),
        cell: ({ row }) => formatAdminDateTime(row.original.updated_at),
      },
      {
        accessorKey: 'created_at',
        header: () => t('ticket.columns.created_at'),
        cell: ({ row }) => formatAdminDateTime(row.original.created_at),
      },
      {
        id: 'actions',
        header: () => t('common.table.columns.actions'),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <IconDots className="tabler-icon h-4 w-4" stroke={2} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openDetail(row.original)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                {t('ticket.actions.reply')}
              </DropdownMenuItem>
              {isWithdrawTicketRow(row.original) ? (
                <>
                  <DropdownMenuItem onClick={() => closeTicket(row.original, { withdrawPaid: true })}>
                    {t('ticket.actions.approve_withdraw')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => closeTicket(row.original, { withdrawRejected: true })}>
                    {t('ticket.actions.close_reject_withdraw')}
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => closeTicket(row.original)}>
                  {t('ticket.actions.close_ticket')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t],
  )

  const typeColumns = useMemo<ColumnDef<TicketType, unknown>[]>(
    () => [
      { accessorKey: 'id', header: () => t('ticket.types.columns.id') },
      { accessorKey: 'name', header: () => t('ticket.types.columns.name') },
      { accessorKey: 'sort', header: () => t('ticket.types.columns.sort') },
      {
        accessorKey: 'show',
        header: () => t('ticket.types.columns.show'),
        cell: ({ row }) => (
          <Switch checked={Boolean(row.original.show)} disabled />
        ),
      },
      {
        id: 'actions',
        header: () => t('ticket.types.columns.actions'),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <IconDots className="tabler-icon h-4 w-4" stroke={2} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openTypeEdit(row.original)}>
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteType(row.original)}
              >
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t],
  )

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      <div className="mb-2">
        <h2 className="m-0 text-2xl font-bold tracking-tight">{t('ticket.title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('ticket.description')}</p>
      </div>

      <div className="-mx-4 flex-1 overflow-auto px-4 py-1">
        <Tabs
          value={statusTab}
          onValueChange={(v) => {
            setStatusTab(v as 'open' | 'closed')
            setPage(1)
          }}
        >
          <TabsList>
            <TabsTrigger value="open">{t('ticket.status.processing')}</TabsTrigger>
            <TabsTrigger value="closed">{t('ticket.status.closed')}</TabsTrigger>
          </TabsList>
          <TabsContent value={statusTab} className="flex w-full flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder={t('ticket.list.search_placeholder')}
                className={`h-8 max-w-xs ${inputCls}`}
              />
              <select
                className={`h-8 rounded-md border border-input bg-transparent px-2 text-sm ${inputCls}`}
                value={replyStatusFilter}
                onChange={(e) => {
                  setReplyStatusFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">
                  {t('ticket.filter.reply_status_all')}
                </option>
                <option value="0">{t('ticket.status.pending')}</option>
                <option value="1">{t('ticket.status.replied')}</option>
              </select>
              <select
                className={`h-8 rounded-md border border-input bg-transparent px-2 text-sm ${inputCls}`}
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">{t('ticket.filter.type_all')}</option>
                {ticketTypes.map((type) => (
                  <option key={type.id} value={String(type.id)}>
                    {type.name}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm" className="h-8" onClick={() => load()}>
                {t('common.search')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-0 space-x-2 px-3"
                onClick={() => {
                  openTypeCreate()
                  setTypesDialogOpen(true)
                }}
              >
                <Settings className="h-4 w-4" />
                <span>{t('ticket.types.manage')}</span>
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
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.subject ?? t('ticket.detail.title')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {detail?.user?.email ? (
              <p className="text-sm text-muted-foreground">{detail.user.email}</p>
            ) : null}
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-3">
              {(detail?.messages ?? []).map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-md p-2 text-sm ${msg.is_me ? 'bg-primary/10' : 'bg-muted'}`}
                >
                  <p>{msg.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatAdminDateTime(msg.created_at)}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('ticket.reply.label')}</Label>
              {detail?.status === 1 ? (
                <p className="text-sm text-muted-foreground">{t('ticket.status.closed')}</p>
              ) : (
                <textarea
                  className={textareaCls}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={sendReply} disabled={saving || !reply.trim() || detail?.status === 1}>
              {t('ticket.actions.reply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={typesDialogOpen} onOpenChange={setTypesDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('ticket.types.dialog_title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('ticket.types.dialog_description')}</p>
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-md border p-3">
              <div className="mb-3 flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-2">
                  <Label>{t('ticket.types.form.name')}</Label>
                  <Input
                    value={typeForm.name}
                    placeholder={t('ticket.types.form.name_placeholder')}
                    className={`h-8 w-48 ${inputCls}`}
                    onChange={(e) => setTypeForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>{t('ticket.types.form.sort')}</Label>
                  <Input
                    type="number"
                    value={typeForm.sort}
                    placeholder={t('ticket.types.form.sort_placeholder')}
                    className={`h-8 w-24 ${inputCls}`}
                    onChange={(e) => setTypeForm((f) => ({ ...f, sort: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2 pb-1.5">
                  <Switch
                    checked={typeForm.show}
                    onCheckedChange={(v) => setTypeForm((f) => ({ ...f, show: v }))}
                  />
                  <Label>{t('ticket.types.form.show')}</Label>
                </div>
                <div className="flex items-center gap-2 pb-0.5">
                  <Button size="sm" className="h-8" onClick={saveType} disabled={typeSaving}>
                    {typeEditing ? (
                      t('common.save')
                    ) : (
                      <>
                        <Plus className="mr-1 h-4 w-4" />
                        {t('ticket.types.add')}
                      </>
                    )}
                  </Button>
                  {typeEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={openTypeCreate}
                      disabled={typeSaving}
                    >
                      {t('common.cancel')}
                    </Button>
                  ) : null}
                </div>
              </div>
              <DataTable
                columns={typeColumns}
                data={ticketTypes}
                emptyText={t('ticket.types.empty')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTypesDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  )
}
