import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, Plus, Trash2, UserCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { fetchJsonList, postJson } from '@/lib/api'
import { inputCls, textareaCls } from '@/lib/form-styles'
import { useIdListSort } from '@/lib/use-id-list-sort'
import { DataTable } from '@/components/shared/DataTable'
import { SortRowControls, SortToolbar } from '@/components/shared/SortToolbar'
import { FormSelect } from '@/components/shared/FormSelect'
import { SuffixInput } from '@/components/shared/SuffixInput'
import { TagInput } from '@/components/shared/TagInput'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

type PlanRow = {
  id?: number
  name?: string
  group_id?: number | null
  group?: { id?: number; name?: string } | null
  transfer_enable?: number
  speed_limit?: number | null
  device_limit?: number | null
  capacity_limit?: number | null
  reset_traffic_method?: number | null
  content?: string
  prices?: Record<string, number>
  tags?: string[]
  show?: boolean | number
  sell?: boolean | number
  renew?: boolean | number
  sort?: number
  users_count?: number
  active_users_count?: number
}

type GroupRow = { id?: number; name?: string }

const MAIN_PRICE_PERIODS = [
  'monthly',
  'quarterly',
  'half_yearly',
  'yearly',
  'two_yearly',
  'three_yearly',
] as const

const EXTRA_PRICE_PERIODS = ['onetime', 'reset_traffic'] as const

const RESET_METHOD_OPTIONS = [
  { value: '', key: 'follow_system' },
  { value: '0', key: 'monthly_first' },
  { value: '1', key: 'monthly_reset' },
  { value: '2', key: 'no_reset' },
  { value: '3', key: 'yearly_first' },
  { value: '4', key: 'yearly_reset' },
] as const

const PRICE_BADGE_PERIODS = [
  { key: 'monthly', unitKey: 'month' },
  { key: 'quarterly', unitKey: 'quarter' },
  { key: 'half_yearly', unitKey: 'half_year' },
  { key: 'yearly', unitKey: 'year' },
  { key: 'two_yearly', unitKey: 'two_year' },
  { key: 'three_yearly', unitKey: 'three_year' },
  { key: 'onetime', unitKey: '' },
  { key: 'reset_traffic', unitKey: 'times' },
] as const

const PRICE_PERIOD_UNIT_KEYS: Record<string, string> = {
  monthly: 'month',
  quarterly: 'quarter',
  half_yearly: 'half_year',
  yearly: 'year',
  two_yearly: 'two_year',
  three_yearly: 'three_year',
  reset_traffic: 'times',
}

function pricePeriodSuffix(period: string, t: (key: string) => string) {
  const unitKey = PRICE_PERIOD_UNIT_KEYS[period]
  if (unitKey) {
    return t(`subscribe.plan.columns.price_period.unit.${unitKey}`)
  }
  return '元'
}

function PlanStatsCell({ row }: { row: PlanRow }) {
  const usersCount = row.users_count ?? 0
  const activeCount = row.active_users_count ?? 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex cursor-help items-center gap-1 rounded-md bg-slate-50 px-2 py-1 transition-colors hover:bg-slate-100">
        <Users className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">{usersCount}</span>
      </div>
      <div className="flex cursor-help items-center gap-1 rounded-md bg-green-50 px-2 py-1 transition-colors hover:bg-green-100">
        <UserCheck className="h-3.5 w-3.5 text-green-600" />
        <span className="text-sm font-medium text-green-700">{activeCount}</span>
      </div>
    </div>
  )
}

function PlanPriceCell({ row, t }: { row: PlanRow; t: (key: string) => string }) {
  const prices = row.prices ?? {}
  const priced = PRICE_BADGE_PERIODS.filter(({ key }) => prices[key] != null)
  if (!priced.length) {
    return (
      <Badge
        variant="outline"
        className="border-dashed px-2 py-0.5 text-xs font-medium text-muted-foreground"
      >
        {t('subscribe.plan.columns.price_period.no_price')}
      </Badge>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {priced.map(({ key, unitKey }) => (
        <Badge
          key={key}
          variant="secondary"
          className="text-nowrap border border-border/50 px-2 py-0.5 font-medium"
        >
          {t(`subscribe.plan.columns.price_period.${key}`)} ¥{prices[key]}
          {unitKey ? t(`subscribe.plan.columns.price_period.unit.${unitKey}`) : ''}
        </Badge>
      ))}
    </div>
  )
}

const emptyPlan = (): PlanRow => ({
  name: '',
  transfer_enable: 100,
  group_id: null,
  prices: {},
  show: true,
  sell: true,
  renew: true,
  tags: [],
})

export default function PlanPage() {
  const { t } = useTranslation()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [data, setData] = useState<PlanRow[]>([])
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PlanRow | null>(null)
  const [form, setForm] = useState<PlanRow>(emptyPlan())
  const [forceUpdate, setForceUpdate] = useState(false)
  const [showContentPreview, setShowContentPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([fetchJsonList('/plan/fetch'), fetchJsonList('/server/group/fetch')])
      .then(([plans, grps]) => {
        setData(plans as PlanRow[])
        setGroups(grps as GroupRow[])
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setEditing(null)
    setForceUpdate(false)
    setShowContentPreview(false)
    setForm(emptyPlan())
    setDialogOpen(true)
  }

  function openEdit(row: PlanRow) {
    setEditing(row)
    setForceUpdate(false)
    setForm({
      ...row,
      prices: { ...(row.prices ?? {}) },
      tags: row.tags ?? [],
    })
    setDialogOpen(true)
  }

  async function savePlan() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        ...form,
        id: editing?.id,
        force_update: editing ? forceUpdate : undefined,
      }
      await postJson('/plan/save', payload)
      toast.success(t('common.success'))
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleField(row: PlanRow, field: 'show' | 'sell' | 'renew') {
    try {
      await postJson('/plan/update', { id: row.id, [field]: !row[field] })
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function deletePlan(row: PlanRow) {
    if (
      !(await confirm(
        t('subscribe.plan.columns.delete_confirm.title'),
        t('subscribe.plan.columns.delete_confirm.description'),
      ))
    )
      return
    try {
      await postJson('/plan/drop', { id: row.id })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  function setPrice(period: string, value: string) {
    const num = value === '' ? undefined : Number(value)
    setForm((f) => {
      const prices = { ...(f.prices ?? {}) }
      if (num === undefined || Number.isNaN(num)) {
        delete prices[period]
      } else {
        prices[period] = num
      }
      return { ...f, prices }
    })
  }

  function setBasePrice(value: string) {
    const num = value === '' ? undefined : Number(value)
    setForm((f) => {
      const prices = { ...(f.prices ?? {}) }
      if (num === undefined || Number.isNaN(num)) {
        delete prices.monthly
      } else {
        prices.monthly = num
      }
      return { ...f, prices }
    })
  }

  function clearAllPrices() {
    setForm((f) => ({ ...f, prices: {} }))
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((row) => String(row.name ?? '').toLowerCase().includes(q))
  }, [data, search])

  const sort = useIdListSort(filtered, '/plan/sort')

  async function handleSaveSort() {
    const ok = await sort.saveSort()
    if (ok) load()
  }

  const columns = useMemo<ColumnDef<PlanRow, unknown>[]>(
    () => [
      ...(sort.sortMode
        ? [
            {
              id: 'sort',
              header: () => t('server.columns.sort'),
              cell: ({ row }: { row: { index: number } }) => (
                <SortRowControls
                  index={row.index}
                  total={sort.sortRows.length}
                  draggable
                  onMoveUp={() => sort.moveUp(row.index)}
                  onMoveDown={() => sort.moveDown(row.index)}
                  onDragStart={() => sort.setDragIndex(row.index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => sort.handleDrop(row.index)}
                />
              ),
            } as ColumnDef<PlanRow, unknown>,
          ]
        : []),
      { accessorKey: 'id', header: () => t('subscribe.plan.columns.id') },
      {
        accessorKey: 'show',
        header: () => t('subscribe.plan.columns.show'),
        cell: ({ row }) => (
          <Switch
            checked={Boolean(row.original.show)}
            onCheckedChange={() => toggleField(row.original, 'show')}
          />
        ),
      },
      {
        accessorKey: 'sell',
        header: () => t('subscribe.plan.columns.sell'),
        cell: ({ row }) => (
          <Switch
            checked={Boolean(row.original.sell)}
            onCheckedChange={() => toggleField(row.original, 'sell')}
          />
        ),
      },
      {
        accessorKey: 'renew',
        header: () => (
          <span title={t('subscribe.plan.columns.renew_tooltip')}>
            {t('subscribe.plan.columns.renew')}
          </span>
        ),
        cell: ({ row }) => (
          <Switch
            checked={Boolean(row.original.renew)}
            onCheckedChange={() => toggleField(row.original, 'renew')}
          />
        ),
      },
      { accessorKey: 'name', header: () => t('subscribe.plan.columns.name') },
      {
        id: 'stats',
        header: () => t('subscribe.plan.columns.stats'),
        cell: ({ row }) => <PlanStatsCell row={row.original} />,
      },
      {
        accessorKey: 'group',
        header: () => t('subscribe.plan.columns.group'),
        cell: ({ row }) => {
          const name = row.original.group?.name
          if (!name) return null
          return (
            <Badge
              variant="secondary"
              className="flex items-center gap-1.5 text-nowrap border border-border/50 bg-secondary/50 px-2 py-0.5 font-medium"
            >
              {name}
            </Badge>
          )
        },
      },
      {
        id: 'prices',
        header: () => t('subscribe.plan.columns.price'),
        cell: ({ row }) => <PlanPriceCell row={row.original} t={t} />,
      },
      ...(!sort.sortMode
        ? [
            {
              id: 'actions',
              header: () => t('subscribe.plan.columns.actions'),
              cell: ({ row }: { row: { original: PlanRow } }) => (
                <div className="flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-muted"
                    onClick={() => openEdit(row.original)}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    <span className="sr-only">{t('subscribe.plan.columns.edit')}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-muted"
                    onClick={() => deletePlan(row.original)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    <span className="sr-only">{t('subscribe.plan.columns.delete')}</span>
                  </Button>
                </div>
              ),
            } as ColumnDef<PlanRow, unknown>,
          ]
        : []),
    ],
    [t, sort],
  )

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="m-0 text-2xl font-bold tracking-tight">{t('subscribe.plan.title')}</h2>
          <p className="mt-2 text-muted-foreground">{t('subscribe.plan.page.description')}</p>
        </div>
      </div>

      <div className="-mx-4 flex-1 overflow-auto px-4 py-1">
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {!sort.sortMode ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-0 space-x-2 px-3 text-xs"
                onClick={openCreate}
              >
                <Plus className="h-4 w-4" />
                <span>{t('subscribe.plan.add')}</span>
              </Button>
            ) : null}
            <SortToolbar
              sortMode={sort.sortMode}
              saving={sort.sortSaving}
              editLabel={t('subscribe.plan.sort.edit')}
              saveLabel={t('subscribe.plan.sort.save')}
              onEdit={sort.enterSort}
              onSave={handleSaveSort}
              onCancel={sort.cancelSort}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('subscribe.plan.search')}
              className={`h-8 min-w-[150px] flex-1 sm:w-[150px] lg:w-[250px] ${inputCls}`}
              disabled={sort.sortMode}
            />
          </div>
          <DataTable columns={columns} data={sort.displayRows} loading={loading} />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="!flex max-h-[810px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[576px]">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>
              {editing
                ? t('subscribe.plan.form.edit_title')
                : t('subscribe.plan.form.add_title')}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="xb-stack-4 px-6 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="xb-stack-2">
                <Label>{t('subscribe.plan.form.name.label')}</Label>
                <input
                  className={inputCls}
                  placeholder={t('subscribe.plan.form.name.placeholder')}
                  value={form.name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="xb-stack-2">
                <Label>{t('subscribe.plan.form.tags.label')}</Label>
                <TagInput
                  value={form.tags ?? []}
                  onChange={(tags) => setForm((f) => ({ ...f, tags }))}
                  placeholder={t('subscribe.plan.form.tags.placeholder')}
                />
              </div>
              <div className="xb-stack-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t('subscribe.plan.form.group.label')}</Label>
                  <Link
                    to="/server/group"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setDialogOpen(false)}
                  >
                    {t('subscribe.plan.form.group.add')}
                  </Link>
                </div>
                <FormSelect
                  value={form.group_id != null ? String(form.group_id) : ''}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      group_id: v ? Number(v) : null,
                    }))
                  }
                  options={[
                    { value: '', label: t('subscribe.plan.form.group.placeholder') },
                    ...groups.map((g) => ({ value: String(g.id), label: String(g.name) })),
                  ]}
                />
              </div>
              <div className="xb-stack-2">
                <Label>{t('subscribe.plan.form.transfer.label')}</Label>
                <SuffixInput
                  suffix={t('subscribe.plan.form.transfer.unit')}
                  type="number"
                  placeholder={t('subscribe.plan.form.transfer.placeholder')}
                  value={form.transfer_enable ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, transfer_enable: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="xb-stack-2">
                <Label>{t('subscribe.plan.form.speed.label')}</Label>
                <SuffixInput
                  suffix={t('subscribe.plan.form.speed.unit')}
                  type="number"
                  placeholder={t('subscribe.plan.form.speed.placeholder')}
                  value={form.speed_limit ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      speed_limit: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>
              <div className="xb-stack-2">
                <Label>{t('subscribe.plan.form.device.label')}</Label>
                <SuffixInput
                  suffix={t('subscribe.plan.form.device.unit')}
                  type="number"
                  placeholder={t('subscribe.plan.form.device.placeholder')}
                  value={form.device_limit ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      device_limit: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>
              <div className="xb-stack-2">
                <Label>{t('subscribe.plan.form.capacity.label')}</Label>
                <SuffixInput
                  suffix={t('subscribe.plan.form.capacity.unit')}
                  type="number"
                  placeholder={t('subscribe.plan.form.capacity.placeholder')}
                  value={form.capacity_limit ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      capacity_limit: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                />
              </div>
              <div className="xb-stack-2">
                <Label>{t('subscribe.plan.form.reset_method.label')}</Label>
                <FormSelect
                  value={form.reset_traffic_method == null ? '' : String(form.reset_traffic_method)}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      reset_traffic_method: v === '' ? null : Number(v),
                    }))
                  }
                  options={RESET_METHOD_OPTIONS.map((opt) => ({
                    value: opt.value,
                    label: t(`subscribe.plan.form.reset_method.options.${opt.key}`),
                  }))}
                />
              </div>
            </div>
            <div className="xb-stack-4 rounded-lg border border-dashed p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{t('subscribe.plan.form.price.title')}</span>
                <div className="flex items-center gap-2">
                  <SuffixInput
                    prefix="¥"
                    type="number"
                    className="h-8 w-24 text-xs"
                    placeholder={t('subscribe.plan.form.price.base_price')}
                    value={form.prices?.monthly ?? ''}
                    onChange={(e) => setBasePrice(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    title={t('subscribe.plan.form.price.clear.tooltip')}
                    onClick={clearAllPrices}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MAIN_PRICE_PERIODS.map((period) => (
                  <div key={period} className="xb-stack-2">
                    <Label className="text-xs font-normal text-muted-foreground">
                      {t(`subscribe.plan.columns.price_period.${period}`)}
                    </Label>
                    <SuffixInput
                      suffix={pricePeriodSuffix(period, t)}
                      type="number"
                      className="text-xs"
                      value={form.prices?.[period] ?? ''}
                      onChange={(e) => setPrice(period, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {EXTRA_PRICE_PERIODS.map((period) => (
                  <div key={period} className="xb-stack-2">
                    <Label className="text-xs font-normal text-muted-foreground">
                      {t(`subscribe.plan.columns.price_period.${period}`)}
                    </Label>
                    <SuffixInput
                      suffix={pricePeriodSuffix(period, t)}
                      type="number"
                      className="text-xs"
                      value={form.prices?.[period] ?? ''}
                      onChange={(e) => setPrice(period, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
            {editing ? (
              <div className="xb-stack-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>{t('subscribe.plan.form.content.label')}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          content: t('subscribe.plan.form.content.template.content'),
                        }))
                      }
                    >
                      {t('subscribe.plan.form.content.template.button')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setShowContentPreview((v) => !v)}
                    >
                      {showContentPreview
                        ? t('subscribe.plan.form.content.preview_button.hide')
                        : t('subscribe.plan.form.content.preview_button.show')}
                    </Button>
                  </div>
                </div>
                <textarea
                  className={`${textareaCls} min-h-[232px]`}
                  placeholder={t('subscribe.plan.form.content.placeholder')}
                  value={form.content ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                />
                {showContentPreview && form.content ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                    {form.content}
                  </div>
                ) : null}
              </div>
            ) : null}
            {editing ? (
              <div className="flex items-center gap-2">
                <Switch checked={forceUpdate} onCheckedChange={setForceUpdate} />
                <Label>{t('subscribe.plan.form.force_update.label')}</Label>
              </div>
            ) : null}
          </div>
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('subscribe.plan.form.submit.cancel')}
            </Button>
            <Button onClick={savePlan} disabled={saving}>
              {saving
                ? t('subscribe.plan.form.submit.submitting')
                : t('subscribe.plan.form.submit.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  )
}
