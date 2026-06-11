import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { IconDots } from '@tabler/icons-react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  fetchJsonList,
  postJson,
  type PaymentFormField,
} from '@/lib/api'
import { inputCls } from '@/lib/form-styles'
import { useIdListSort } from '@/lib/use-id-list-sort'
import { DataTable } from '@/components/shared/DataTable'
import { SortRowControls, SortToolbar } from '@/components/shared/SortToolbar'
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

type PaymentRow = {
  id?: number
  name?: string
  payment?: string
  icon?: string
  enable?: boolean | number
  sort?: number
  config?: Record<string, unknown>
  notify_domain?: string
  handling_fee_fixed?: number
  handling_fee_percent?: number
}

export default function PaymentPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<PaymentRow[]>([])
  const [methods, setMethods] = useState<string[]>([])
  const [dynamicFields, setDynamicFields] = useState<PaymentFormField[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PaymentRow | null>(null)
  const [form, setForm] = useState<PaymentRow>({ config: {} })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchJsonList('/payment/fetch')
      .then((rows) => setData(rows as PaymentRow[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    load()
    fetchJsonList('/payment/getPaymentMethods').then((rows) => setMethods(rows as string[]))
  }, [load])

  async function loadPaymentForm(payment: string, id?: number) {
    try {
      const fields = await postJson<PaymentFormField[]>('/payment/getPaymentForm', {
        payment,
        id,
      })
      setDynamicFields(Array.isArray(fields) ? fields : [])
      const config: Record<string, unknown> = { ...(form.config ?? {}) }
      for (const field of Array.isArray(fields) ? fields : []) {
        const key = field.name ?? field.key
        if (key && field.value !== undefined && config[key] === undefined) {
          config[key] = field.value
        }
      }
      setForm((f) => ({ ...f, config }))
    } catch {
      setDynamicFields([])
    }
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', payment: '', config: {}, enable: true })
    setDynamicFields([])
    setDialogOpen(true)
  }

  function openEdit(row: PaymentRow) {
    setEditing(row)
    setForm({
      ...row,
      config: { ...(row.config ?? {}) },
    })
    if (row.payment) loadPaymentForm(row.payment, row.id)
    setDialogOpen(true)
  }

  async function savePayment() {
    setSaving(true)
    try {
      await postJson('/payment/save', { ...form, id: editing?.id })
      toast.success(t('common.success'))
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function toggleEnable(row: PaymentRow) {
    try {
      await postJson('/payment/show', { id: row.id })
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  async function deleteRow(row: PaymentRow) {
    if (!window.confirm(t('common.deleteConfirm', { defaultValue: '确认删除？' }))) return
    try {
      await postJson('/payment/drop', { id: row.id })
      toast.success(t('common.success'))
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'))
    }
  }

  function setConfigField(key: string, value: unknown) {
    setForm((f) => ({ ...f, config: { ...(f.config ?? {}), [key]: value } }))
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter(
      (row) =>
        String(row.name ?? '').toLowerCase().includes(q) ||
        String(row.payment ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const sort = useIdListSort(filtered, '/payment/sort')

  async function handleSaveSort() {
    const ok = await sort.saveSort()
    if (ok) load()
  }

  const columns = useMemo<ColumnDef<PaymentRow, unknown>[]>(
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
            } as ColumnDef<PaymentRow, unknown>,
          ]
        : []),
      { accessorKey: 'id', header: () => t('payment.table.columns.id') },
      { accessorKey: 'name', header: () => t('payment.table.columns.name') },
      { accessorKey: 'payment', header: () => t('payment.table.columns.payment') },
      {
        accessorKey: 'enable',
        header: () => t('payment.table.columns.enable'),
        cell: ({ row }) => (
          <Switch
            checked={Boolean(row.original.enable)}
            onCheckedChange={() => toggleEnable(row.original)}
          />
        ),
      },
      { accessorKey: 'sort', header: () => t('server.columns.sort') },
      ...(!sort.sortMode
        ? [
            {
              id: 'actions',
              header: () => t('common.table.columns.actions', { defaultValue: '操作' }),
              cell: ({ row }: { row: { original: PaymentRow } }) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <IconDots className="tabler-icon h-4 w-4" stroke={2} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(row.original)}>
                      {t('common.edit', { defaultValue: '编辑' })}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteRow(row.original)}>
                      {t('common.delete', { defaultValue: '删除' })}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            } as ColumnDef<PaymentRow, unknown>,
          ]
        : []),
    ],
    [t, sort],
  )

  return (
    <div>
      <div className="mb-2">
        <h2 className="m-0 text-2xl font-bold tracking-tight">{t('payment.title')}</h2>
        <p className="mt-2 text-muted-foreground">{t('payment.description')}</p>
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
                <span>{t('payment.form.add', { defaultValue: '添加支付' })}</span>
              </Button>
            ) : null}
            <SortToolbar
              sortMode={sort.sortMode}
              saving={sort.sortSaving}
              editLabel={t('payment.table.toolbar.sort.edit', { defaultValue: '编辑排序' })}
              saveLabel={t('payment.table.toolbar.sort.save', { defaultValue: '保存排序' })}
              hint={sort.sortMode ? t('payment.table.toolbar.sort.hint', { defaultValue: '拖拽支付方式进行排序，完成后点击保存' }) : undefined}
              onEdit={sort.enterSort}
              onSave={handleSaveSort}
              onCancel={sort.cancelSort}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className={`h-8 min-w-[150px] flex-1 sm:w-[150px] lg:w-[250px] ${inputCls}`}
              disabled={sort.sortMode}
            />
          </div>
          <DataTable columns={columns} data={sort.displayRows} loading={loading} />
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t('payment.form.edit.title', { defaultValue: '编辑支付' })
                : t('payment.form.add.title', { defaultValue: '添加支付' })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>{t('payment.form.fields.name')}</Label>
              <input
                className={inputCls}
                value={form.name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('payment.form.fields.payment')}</Label>
              <select
                className={inputCls}
                value={form.payment ?? ''}
                onChange={(e) => {
                  const payment = e.target.value
                  setForm((f) => ({ ...f, payment, config: {} }))
                  if (payment) loadPaymentForm(payment, editing?.id)
                }}
              >
                <option value="">{t('common.select', { defaultValue: '请选择' })}</option>
                {methods.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t('payment.form.fields.icon')}</Label>
              <input
                className={inputCls}
                value={form.icon ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              />
            </div>
            {dynamicFields.map((field, idx) => {
              const key = field.name ?? field.key ?? `field_${idx}`
              return (
                <div key={key} className="flex flex-col gap-2">
                  <Label>{field.label ?? key}</Label>
                  {field.type === 'select' && field.options ? (
                    <select
                      className={inputCls}
                      value={String(form.config?.[key] ?? field.value ?? '')}
                      onChange={(e) => setConfigField(key, e.target.value)}
                    >
                      {field.options.map((opt) => (
                        <option key={String(opt.value)} value={String(opt.value)}>
                          {opt.label ?? opt.value}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={inputCls}
                      value={String(form.config?.[key] ?? field.value ?? '')}
                      placeholder={field.placeholder}
                      onChange={(e) => setConfigField(key, e.target.value)}
                    />
                  )}
                  {field.description ? (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  ) : null}
                </div>
              )
            })}
            <div className="flex flex-col gap-2">
              <Label>{t('payment.form.fields.notify_domain')}</Label>
              <input
                className={inputCls}
                value={form.notify_domain ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, notify_domain: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel', { defaultValue: '取消' })}
            </Button>
            <Button onClick={savePayment} disabled={saving}>
              {t('common.save', { defaultValue: '保存' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
