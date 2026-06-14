import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { IconDots } from '@tabler/icons-react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { adminApi, downloadAdminFile, fetchJsonList, postJson, type PaginatedResult } from '@/lib/api'
import { getAdminCurrencySymbol, loadAdminCurrency } from '@/lib/currency'
import { inputCls } from '@/lib/form-styles'
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

type CouponRow = {
  id?: number
  name?: string
  code?: string
  type?: number
  value?: number
  limit_use?: number | null
  limit_use_with_user?: number | null
  limit_plan_ids?: number[] | null
  limit_period?: string[] | null
  show?: boolean | number
  started_at?: number
  ended_at?: number
}

type PlanRow = { id?: number; name?: string }

const PERIOD_KEYS = [
  'monthly',
  'quarterly',
  'half_yearly',
  'yearly',
  'two_yearly',
  'three_yearly',
  'onetime',
  'reset_traffic',
] as const

function tsToInput(ts?: number) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function inputToTs(value: string) {
  if (!value) return Math.floor(Date.now() / 1000)
  return Math.floor(new Date(value).getTime() / 1000)
}

function defaultForm() {
  const now = Math.floor(Date.now() / 1000)
  return {
    name: '',
    code: '',
    type: 1,
    value: 0,
    limit_use: '',
    limit_use_with_user: '',
    limit_plan_ids: [] as number[],
    limit_period: [] as string[],
    generate_count: '',
    started_at_input: tsToInput(now),
    ended_at_input: tsToInput(now + 86400 * 30),
  }
}

export default function CouponPage() {
  const { t } = useTranslation()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [data, setData] = useState<CouponRow[]>([])
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(defaultForm())
  const [saving, setSaving] = useState(false)
  const [currencySymbol, setCurrencySymbol] = useState('¥')

  const load = useCallback(() => {
    setLoading(true)
    const filter: { id: string; value: string | number }[] = []
    if (search.trim()) filter.push({ id: 'code', value: search.trim() })
    if (typeFilter !== '') filter.push({ id: 'type', value: typeFilter })

    adminApi<PaginatedResult<CouponRow>>('/coupon/fetch', {
      method: 'POST',
      body: JSON.stringify({
        current: page,
        pageSize,
        filter: filter.length ? filter : undefined,
      }),
    })
      .then((res) => {
        setData(Array.isArray(res.data) ? res.data : [])
        setTotal(res.total ?? 0)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [page, pageSize, search, typeFilter, t])

  useEffect(() => {
    void loadAdminCurrency().then(() => setCurrencySymbol(getAdminCurrencySymbol()))
    fetchJsonList('/plan/fetch').then((rows) => setPlans(rows as PlanRow[]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditingId(null)
    setForm(defaultForm())
    setDialogOpen(true)
  }

  function openEdit(row: CouponRow) {
    setEditingId(row.id ?? null)
    setForm({
      name: row.name ?? '',
      code: row.code ?? '',
      type: row.type ?? 1,
      value: row.type === 1 ? (row.value ?? 0) / 100 : (row.value ?? 0),
      limit_use: row.limit_use != null ? String(row.limit_use) : '',
      limit_use_with_user: row.limit_use_with_user != null ? String(row.limit_use_with_user) : '',
      limit_plan_ids: Array.isArray(row.limit_plan_ids) ? row.limit_plan_ids : [],
      limit_period: Array.isArray(row.limit_period) ? row.limit_period : [],
      generate_count: '',
      started_at_input: tsToInput(row.started_at),
      ended_at_input: tsToInput(row.ended_at),
    })
    setDialogOpen(true)
  }

  async function saveCoupon() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        code: form.code || undefined,
        type: form.type,
        value: form.type === 1 ? Math.round(Number(form.value) * 100) : form.value,
        started_at: inputToTs(String(form.started_at_input ?? '')),
        ended_at: inputToTs(String(form.ended_at_input ?? '')),
      }
      if (form.limit_use !== '') payload.limit_use = Number(form.limit_use)
      if (form.limit_use_with_user !== '') payload.limit_use_with_user = Number(form.limit_use_with_user)
      if (form.limit_plan_ids.length) payload.limit_plan_ids = form.limit_plan_ids
      if (form.limit_period.length) payload.limit_period = form.limit_period
      if (editingId) {
        payload.id = editingId
        await postJson('/coupon/generate', payload)
      } else if (form.generate_count !== '') {
        payload.generate_count = Number(form.generate_count)
        await downloadAdminFile('/coupon/generate', { method: 'POST', jsonBody: payload }, 'coupons.csv')
      } else {
        await postJson('/coupon/generate', payload)
      }
      toast.success(t('common.success'))
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleShow(row: CouponRow) {
    try {
      await postJson('/coupon/show', { id: row.id })
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function deleteRow(row: CouponRow) {
    if (
      !(await confirm(
        t('coupon.table.actions.deleteConfirm.title'),
        t('coupon.table.actions.deleteConfirm.description'),
        {
          confirmLabel: t('coupon.table.actions.deleteConfirm.confirmText'),
        },
      ))
    )
      return
    try {
      await postJson('/coupon/drop', { id: row.id })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  function togglePlanId(planId: number) {
    setForm((f) => {
      const ids = f.limit_plan_ids.includes(planId)
        ? f.limit_plan_ids.filter((id) => id !== planId)
        : [...f.limit_plan_ids, planId]
      return { ...f, limit_plan_ids: ids }
    })
  }

  function togglePeriod(period: string) {
    setForm((f) => {
      const periods = f.limit_period.includes(period)
        ? f.limit_period.filter((p) => p !== period)
        : [...f.limit_period, period]
      return { ...f, limit_period: periods }
    })
  }

  const columns = useMemo<ColumnDef<CouponRow, unknown>[]>(
    () => [
      { accessorKey: 'id', header: () => t('coupon.table.columns.id') },
      { accessorKey: 'name', header: () => t('coupon.table.columns.name') },
      { accessorKey: 'code', header: () => t('coupon.table.columns.code') },
      {
        accessorKey: 'type',
        header: () => t('coupon.table.columns.type'),
        cell: ({ row }) =>
          row.original.type === 2
            ? t('coupon.type.percent')
            : t('coupon.type.amount'),
      },
      { accessorKey: 'limit_use', header: () => t('coupon.table.columns.limitUse') },
      {
        accessorKey: 'show',
        header: () => t('coupon.table.columns.show'),
        cell: ({ row }) => (
          <Switch
            checked={Boolean(row.original.show)}
            onCheckedChange={() => toggleShow(row.original)}
          />
        ),
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
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                {t('coupon.table.actions.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => deleteRow(row.original)}>
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
        <h2 className="m-0 text-2xl font-bold tracking-tight">{t('coupon.title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('coupon.description')}</p>
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
              <span>{t('coupon.form.add')}</span>
            </Button>
            <select
              className={`h-8 rounded-md border border-input bg-background px-2 text-xs ${inputCls}`}
              value={typeFilter === '' ? '' : String(typeFilter)}
              onChange={(e) => {
                setTypeFilter(e.target.value === '' ? '' : Number(e.target.value))
                setPage(1)
              }}
            >
              <option value="">{t('coupon.table.toolbar.type')}</option>
              <option value="1">{t('coupon.table.toolbar.types.1')}</option>
              <option value="2">{t('coupon.table.toolbar.types.2')}</option>
            </select>
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t('coupon.table.toolbar.search')}
              className={`h-8 min-w-[150px] flex-1 sm:w-[150px] lg:w-[250px] ${inputCls}`}
            />
            {(search || typeFilter !== '') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setSearch('')
                  setTypeFilter('')
                  setPage(1)
                }}
              >
                {t('coupon.table.toolbar.reset')}
              </Button>
            )}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t('coupon.form.edit')
                : t('coupon.form.add')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>{t('coupon.form.name.label')}</Label>
              <input
                className={inputCls}
                value={String(form.name ?? '')}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('coupon.form.code.label')}</Label>
              <input
                className={inputCls}
                value={String(form.code ?? '')}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder={t('coupon.form.code.placeholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t('coupon.form.type.label')}</Label>
                <select
                  className={inputCls}
                  value={Number(form.type ?? 1)}
                  onChange={(e) => setForm((f) => ({ ...f, type: Number(e.target.value) }))}
                >
                  <option value={1}>{t('coupon.type.amount')}</option>
                  <option value={2}>{t('coupon.type.percent')}</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>
                  {t('coupon.form.value.placeholder')}
                  {form.type === 1 ? ` (${currencySymbol})` : ''}
                </Label>
                <input
                  type="number"
                  className={inputCls}
                  value={Number(form.value ?? 0)}
                  onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t('coupon.form.limitUse.label')}</Label>
                <input
                  type="number"
                  className={inputCls}
                  value={form.limit_use}
                  onChange={(e) => setForm((f) => ({ ...f, limit_use: e.target.value }))}
                  placeholder={t('coupon.form.limitUse.placeholder')}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t('coupon.form.limitUseWithUser.label')}</Label>
                <input
                  type="number"
                  className={inputCls}
                  value={form.limit_use_with_user}
                  onChange={(e) => setForm((f) => ({ ...f, limit_use_with_user: e.target.value }))}
                  placeholder={t('coupon.form.limitUseWithUser.placeholder')}
                />
              </div>
            </div>
            {!editingId && (
              <div className="flex flex-col gap-2">
                <Label>{t('coupon.form.generateCount.label')}</Label>
                <input
                  type="number"
                  className={inputCls}
                  value={form.generate_count}
                  onChange={(e) => setForm((f) => ({ ...f, generate_count: e.target.value }))}
                  placeholder={t('coupon.form.generateCount.placeholder')}
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label>{t('coupon.form.limitPlan.label')}</Label>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-md border border-input p-2">
                {plans.map((p) => (
                  <label key={p.id} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={p.id != null && form.limit_plan_ids.includes(p.id)}
                      onChange={() => p.id != null && togglePlanId(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('coupon.form.limitPeriod.label')}</Label>
              <div className="flex flex-wrap gap-2">
                {PERIOD_KEYS.map((period) => (
                  <label key={period} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={form.limit_period.includes(period)}
                      onChange={() => togglePeriod(period)}
                    />
                    {t(`coupon.period.${period}`)}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t('coupon.table.validity.startTime')}</Label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={String(form.started_at_input ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, started_at_input: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t('coupon.table.validity.endTime')}</Label>
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={String(form.ended_at_input ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, ended_at_input: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveCoupon} disabled={saving}>
              {t('coupon.form.submit.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  )
}
