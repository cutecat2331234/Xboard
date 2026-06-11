import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ColumnDef } from '@tanstack/react-table'

import { Gift, Globe, Pencil, Plus, SlidersHorizontal, Sparkles, Target } from 'lucide-react'

import { useTranslation } from 'react-i18next'

import { toast } from 'sonner'

import { downloadAdminFile, fetchJsonList, fetchJsonObject, fetchPaginatedList, postJson } from '@/lib/api'

import { dialogFieldLabelCls, dialogInputCls, inputCls, textareaCls } from '@/lib/form-styles'

import { DataTable } from '@/components/shared/DataTable'
import { DialogFormFooter } from '@/components/shared/DialogFormFooter'
import { FormSelect } from '@/components/shared/FormSelect'
import { SuffixInput } from '@/components/shared/SuffixInput'

import { Button } from '@/components/ui/button'

import {

  Dialog,

  DialogContent,

  DialogHeader,

  DialogTitle,

} from '@/components/ui/dialog'

import { Input } from '@/components/ui/input'

import { Label } from '@/components/ui/label'

import { Switch } from '@/components/ui/switch'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'



type TemplateRow = Record<string, unknown>

type CodeRow = Record<string, unknown>

type CodeForm = {

  id: number

  code: string

  status: number

  max_usage: number

  expires_at_input: string

}

type UsageRow = Record<string, unknown>

type PlanRow = { id?: number; name?: string }



type GiftCardRewards = {

  balance?: number

  transfer_enable?: number

  expire_days?: number

  device_limit?: number

  reset_package?: boolean

  plan_id?: number | null

  plan_validity_days?: number | null

}



type GiftCardConditions = {

  new_user_only?: boolean

  new_user_max_days?: number | null

  paid_user_only?: boolean

  require_invite?: boolean

  allowed_plans?: number[]

  disallowed_plans?: number[]

}



type TemplateForm = {

  id?: number

  name: string

  description: string

  type: number

  status: number

  sort: number

  rewards: GiftCardRewards

  conditions: GiftCardConditions

}



const emptyForm = (): TemplateForm => ({

  name: '',

  description: '',

  type: 1,

  status: 1,

  sort: 0,

  rewards: { balance: 0 },

  conditions: {},

})



function tsToInput(ts?: number | null) {

  if (!ts) return ''

  const d = new Date(ts * 1000)

  const pad = (n: number) => String(n).padStart(2, '0')

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

}



function inputToTs(value: string) {

  if (!value) return null

  return Math.floor(new Date(value).getTime() / 1000)

}



function parseRewards(raw: unknown): GiftCardRewards {

  if (!raw || typeof raw !== 'object') return { balance: 0 }

  const r = raw as GiftCardRewards

  return {

    balance: Number(r.balance ?? 0),

    transfer_enable: r.transfer_enable != null ? Number(r.transfer_enable) : undefined,

    expire_days: r.expire_days != null ? Number(r.expire_days) : undefined,

    device_limit: r.device_limit != null ? Number(r.device_limit) : undefined,

    reset_package: Boolean(r.reset_package),

    plan_id: r.plan_id != null ? Number(r.plan_id) : null,

    plan_validity_days: r.plan_validity_days != null ? Number(r.plan_validity_days) : null,

  }

}



function parseConditions(raw: unknown): GiftCardConditions {

  if (!raw || typeof raw !== 'object') return {}

  const c = raw as GiftCardConditions

  return {

    new_user_only: Boolean(c.new_user_only),

    new_user_max_days: c.new_user_max_days != null ? Number(c.new_user_max_days) : null,

    paid_user_only: Boolean(c.paid_user_only),

    require_invite: Boolean(c.require_invite),

    allowed_plans: Array.isArray(c.allowed_plans) ? c.allowed_plans.map(Number) : [],

    disallowed_plans: Array.isArray(c.disallowed_plans) ? c.disallowed_plans.map(Number) : [],

  }

}



export default function GiftCardPage() {

  const { t } = useTranslation()

  const { confirm, ConfirmDialog } = useConfirmDialog()

  const [tab, setTab] = useState('templates')

  const [templates, setTemplates] = useState<TemplateRow[]>([])

  const [codes, setCodes] = useState<CodeRow[]>([])

  const [codesPage, setCodesPage] = useState(1)

  const [codesTotal, setCodesTotal] = useState(0)

  const [usages, setUsages] = useState<UsageRow[]>([])

  const [usagesPage, setUsagesPage] = useState(1)

  const [usagesTotal, setUsagesTotal] = useState(0)

  const [stats, setStats] = useState<Record<string, unknown>>({})

  const [plans, setPlans] = useState<PlanRow[]>([])

  const [giftTypeIds, setGiftTypeIds] = useState<number[]>([1, 2, 3])

  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)

  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')

  const [form, setForm] = useState<TemplateForm>(emptyForm())

  const [saving, setSaving] = useState(false)

  const [generateOpen, setGenerateOpen] = useState(false)

  const [generateForm, setGenerateForm] = useState({

    template_id: 0,

    count: 10,

    prefix: 'GC',

    expires_hours: '',

    max_usage: 1,

    download_csv: false,

  })

  const [generating, setGenerating] = useState(false)

  const [codeEditOpen, setCodeEditOpen] = useState(false)

  const [codeEditForm, setCodeEditForm] = useState<CodeForm | null>(null)

  const [codeEditSaving, setCodeEditSaving] = useState(false)



  const listPageSize = 20



  useEffect(() => {

    fetchJsonList('/plan/fetch').then((rows) => setPlans(rows as PlanRow[]))

    fetchJsonObject<Record<string, string>>('/gift-card/types')

      .then((types) => {

        if (types && typeof types === 'object') {

          setGiftTypeIds(

            Object.keys(types)

              .map((key) => Number(key))

              .filter((id) => !Number.isNaN(id))

              .sort((a, b) => a - b),

          )

        }

      })

      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))

  }, [t])



  const loadTemplates = useCallback(() => {

    setLoading(true)

    fetchPaginatedList<TemplateRow>('/gift-card/templates', { per_page: 100 })

      .then((res) => setTemplates(res.data))

      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))

      .finally(() => setLoading(false))

  }, [t])



  const loadCodes = useCallback(() => {

    setLoading(true)

    fetchPaginatedList<CodeRow>('/gift-card/codes', { page: codesPage, per_page: listPageSize })

      .then((res) => {

        setCodes(res.data)

        setCodesTotal(res.total)

      })

      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))

      .finally(() => setLoading(false))

  }, [codesPage, t])



  const loadUsages = useCallback(() => {

    setLoading(true)

    fetchPaginatedList<UsageRow>('/gift-card/usages', { page: usagesPage, per_page: listPageSize })

      .then((res) => {

        setUsages(res.data)

        setUsagesTotal(res.total)

      })

      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))

      .finally(() => setLoading(false))

  }, [usagesPage, t])



  const loadStats = useCallback(() => {

    setLoading(true)

    fetchJsonObject<{ total_stats?: Record<string, unknown> }>('/gift-card/statistics')

      .then((res) => setStats(res.total_stats ?? {}))

      .catch((e) => toast.error(e instanceof Error ? e.message : t('common.error')))

      .finally(() => setLoading(false))

  }, [t])



  useEffect(() => {

    if (tab === 'templates') loadTemplates()

    else if (tab === 'codes') loadCodes()

    else if (tab === 'usages') loadUsages()

    else if (tab === 'statistics') loadStats()

  }, [tab, loadTemplates, loadCodes, loadUsages, loadStats])



  function openCreate() {

    setDialogMode('create')

    setForm(emptyForm())

    setDialogOpen(true)

  }



  function openEdit(row: TemplateRow) {

    setDialogMode('edit')

    setForm({

      id: Number(row.id),

      name: String(row.name ?? ''),

      description: String(row.description ?? ''),

      type: Number(row.type ?? 1),

      status: Number(row.status ?? 1) ? 1 : 0,

      sort: Number(row.sort ?? 0),

      rewards: parseRewards(row.rewards),

      conditions: parseConditions(row.conditions),

    })

    setDialogOpen(true)

  }



  function openGenerate(row: TemplateRow) {

    setGenerateForm({

      template_id: Number(row.id),

      count: 10,

      prefix: 'GC',

      expires_hours: '',

      max_usage: 1,

      download_csv: false,

    })

    setGenerateOpen(true)

  }



  function buildTemplatePayload() {

    const rewards: GiftCardRewards = { ...form.rewards }

    if (form.type === 2) {

      delete rewards.balance

      delete rewards.transfer_enable

      delete rewards.expire_days

      delete rewards.device_limit

      delete rewards.reset_package

    } else if (form.type === 1) {

      delete rewards.plan_id

      delete rewards.plan_validity_days

    }



    const conditions: GiftCardConditions = {}

    if (form.conditions.new_user_only) {

      conditions.new_user_only = true

      if (form.conditions.new_user_max_days) {

        conditions.new_user_max_days = form.conditions.new_user_max_days

      }

    }

    if (form.conditions.paid_user_only) conditions.paid_user_only = true

    if (form.conditions.require_invite) conditions.require_invite = true

    if (form.conditions.allowed_plans?.length) {

      conditions.allowed_plans = form.conditions.allowed_plans

    }

    if (form.conditions.disallowed_plans?.length) {

      conditions.disallowed_plans = form.conditions.disallowed_plans

    }



    return {

      name: form.name,

      description: form.description,

      type: form.type,

      status: form.status === 1,

      sort: form.sort,

      rewards,

      conditions: Object.keys(conditions).length ? conditions : null,

    }

  }



  async function saveTemplate() {

    setSaving(true)

    try {

      const payload = buildTemplatePayload()

      if (dialogMode === 'edit' && form.id) {

        await postJson('/gift-card/update-template', { id: form.id, ...payload })

      } else {

        await postJson('/gift-card/create-template', payload)

      }

      toast.success(t('common.success'))

      setDialogOpen(false)

      loadTemplates()

    } catch (e) {

      toast.error(e instanceof Error ? e.message : t('common.error'))

    } finally {

      setSaving(false)

    }

  }



  async function generateCodes() {

    setGenerating(true)

    try {

      const payload: Record<string, unknown> = {

        template_id: generateForm.template_id,

        count: generateForm.count,

        prefix: generateForm.prefix,

        max_usage: generateForm.max_usage,

      }

      if (generateForm.expires_hours) {

        payload.expires_hours = Number(generateForm.expires_hours)

      }

      if (generateForm.download_csv) {

        payload.download_csv = true

        await downloadAdminFile(

          '/gift-card/generate-codes',

          { method: 'POST', jsonBody: payload },

          'gift_codes.csv',

        )

      } else {

        await postJson('/gift-card/generate-codes', payload)

      }

      toast.success(t('common.success'))

      setGenerateOpen(false)

      setCodesPage(1)

      setTab('codes')

      loadCodes()

      loadTemplates()

    } catch (e) {

      toast.error(e instanceof Error ? e.message : t('common.error'))

    } finally {

      setGenerating(false)

    }

  }



  async function exportBatch(batchId: string) {

    try {

      await downloadAdminFile(

        `/gift-card/export-codes?batch_id=${encodeURIComponent(batchId)}`,

        {},

        `gift_cards_${batchId}.txt`,

      )

      toast.success(t('common.success'))

    } catch (e) {

      toast.error(e instanceof Error ? e.message : t('common.error'))

    }

  }



  async function deleteTemplate(row: TemplateRow) {

    if (
      !(await confirm(
        t('giftCard.template.actions.deleteConfirm.title'),
        t('giftCard.template.actions.deleteConfirm.description'),
        {
          confirmLabel: t('giftCard.template.actions.deleteConfirm.confirmText'),
        },
      ))
    )
      return

    try {

      await postJson('/gift-card/delete-template', { id: row.id })

      toast.success(t('common.success'))

      loadTemplates()

    } catch (e) {

      toast.error(e instanceof Error ? e.message : t('common.error'))

    }

  }



  async function toggleCode(row: CodeRow) {

    const disabled = Number(row.status) === 3

    try {

      await postJson('/gift-card/toggle-code', {

        id: row.id,

        action: disabled ? 'enable' : 'disable',

      })

      toast.success(t('common.success'))

      loadCodes()

    } catch (e) {

      toast.error(e instanceof Error ? e.message : t('common.error'))

    }

  }



  async function deleteCode(row: CodeRow) {

    if (
      !(await confirm(
        t('giftCard.template.actions.deleteConfirm.title'),
        t('giftCard.template.actions.deleteConfirm.description'),
        {
          confirmLabel: t('giftCard.template.actions.deleteConfirm.confirmText'),
        },
      ))
    )
      return

    try {

      await postJson('/gift-card/delete-code', { id: row.id })

      toast.success(t('common.success'))

      loadCodes()

    } catch (e) {

      toast.error(e instanceof Error ? e.message : t('common.error'))

    }

  }



  function openEditCode(row: CodeRow) {

    const expiresAt = row.expires_at != null ? Number(row.expires_at) : null

    setCodeEditForm({

      id: Number(row.id),

      code: String(row.code ?? ''),

      status: Number(row.status ?? 0),

      max_usage: Number(row.max_usage ?? 1),

      expires_at_input: tsToInput(expiresAt),

    })

    setCodeEditOpen(true)

  }



  async function saveCode() {

    if (!codeEditForm) return

    setCodeEditSaving(true)

    try {

      const payload: Record<string, unknown> = {

        id: codeEditForm.id,

        status: codeEditForm.status,

        max_usage: codeEditForm.max_usage,

        expires_at: inputToTs(codeEditForm.expires_at_input),

      }

      await postJson('/gift-card/update-code', payload)

      toast.success(t('giftCard.messages.codeStatusUpdated'))

      setCodeEditOpen(false)

      loadCodes()

    } catch (e) {

      toast.error(

        e instanceof Error ? e.message : t('giftCard.messages.updateCodeStatusFailed'),

      )

    } finally {

      setCodeEditSaving(false)

    }

  }



  function togglePlanInCondition(field: 'allowed_plans' | 'disallowed_plans', planId: number) {

    setForm((f) => {

      const current = f.conditions[field] ?? []

      const next = current.includes(planId)

        ? current.filter((id) => id !== planId)

        : [...current, planId]

      return { ...f, conditions: { ...f.conditions, [field]: next } }

    })

  }



  const templateColumns = useMemo<ColumnDef<TemplateRow, unknown>[]>(

    () => [

      { accessorKey: 'id', header: () => t('giftCard.template.table.columns.id') },

      { accessorKey: 'name', header: () => t('giftCard.template.table.columns.name') },

      { accessorKey: 'type_name', header: () => t('giftCard.template.table.columns.type') },

      { accessorKey: 'status', header: () => t('giftCard.template.table.columns.status') },

      {

        accessorKey: 'codes_count',

        header: () => t('giftCard.code.form.count.label'),

      },

      {

        id: 'actions',

        header: () => t('common.table.columns.actions'),

        cell: ({ row }) => (

          <div className="flex flex-wrap gap-1">

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 whitespace-nowrap px-2 text-xs"
              data-testid="gift-template-edit"
              onClick={() => openEdit(row.original)}
            >

              <Pencil className="mr-1 h-3 w-3" />

              {t('giftCard.template.actions.edit')}

            </Button>

            <Button variant="ghost" size="sm" onClick={() => openGenerate(row.original)}>

              <Sparkles className="mr-1 h-3 w-3" />

              {t('giftCard.code.generate.title')}

            </Button>

            <Button

              variant="ghost"

              size="sm"

              className="text-destructive"

              onClick={() => deleteTemplate(row.original)}

            >

              {t('giftCard.template.actions.delete')}

            </Button>

          </div>

        ),

      },

    ],

    [t, openEdit, openGenerate, deleteTemplate],

  )



  const codeColumns = useMemo<ColumnDef<CodeRow, unknown>[]>(

    () => [

      { accessorKey: 'id', header: 'ID' },

      { accessorKey: 'code', header: () => t('giftCard.code.table.columns.code') },

      { accessorKey: 'status', header: () => t('giftCard.code.table.columns.status') },

      { accessorKey: 'template_id', header: () => t('giftCard.code.table.columns.template_name') },

      { accessorKey: 'batch_id', header: () => t('giftCard.code.table.columns.id') },

      {

        id: 'actions',

        header: () => t('common.table.columns.actions'),

        cell: ({ row }) => (

          <div className="flex flex-wrap gap-1">

            {row.original.batch_id ? (

              <Button variant="ghost" size="sm" onClick={() => exportBatch(String(row.original.batch_id))}>

                {t('giftCard.code.actions.export')}

              </Button>

            ) : null}

            <Button variant="ghost" size="sm" onClick={() => openEditCode(row.original)}>

              <Pencil className="mr-1 h-3 w-3" />

              {t('common.edit')}

            </Button>

            <Button variant="ghost" size="sm" onClick={() => toggleCode(row.original)}>

              {Number(row.original.status) === 3
                ? t('giftCard.code.actions.enable')
                : t('giftCard.code.actions.disable')}

            </Button>

            <Button

              variant="ghost"

              size="sm"

              className="text-destructive"

              onClick={() => deleteCode(row.original)}

            >

              {t('giftCard.template.actions.delete')}

            </Button>

          </div>

        ),

      },

    ],

    [t],

  )



  const usageColumns = useMemo<ColumnDef<UsageRow, unknown>[]>(

    () => [

      { accessorKey: 'id', header: 'ID' },

      { accessorKey: 'user_id', header: () => t('giftCard.usage.table.columns.user_email') },

      { accessorKey: 'template_id', header: () => t('giftCard.usage.table.columns.template_name') },

      { accessorKey: 'created_at', header: () => t('giftCard.usage.table.columns.created_at') },

    ],

    [t],

  )



  const giftTypeOptions = useMemo(

    () => giftTypeIds.map((id) => ({ id, label: t(`giftCard.types.${id}`) })),

    [giftTypeIds, t],

  )



  const filteredTemplates = useMemo(() => {

    if (!search.trim()) return templates

    const q = search.toLowerCase()

    return templates.filter((row) => String(row.name ?? '').toLowerCase().includes(q))

  }, [templates, search])



  const codesPageCount = Math.max(1, Math.ceil(codesTotal / listPageSize))

  const usagesPageCount = Math.max(1, Math.ceil(usagesTotal / listPageSize))



  return (

    <div>

      <div className="mb-6 flex items-center justify-between space-y-2">

        <div>

          <h2 className="text-2xl font-bold tracking-tight">{t('giftCard.title')}</h2>

          <p className="mt-2 text-muted-foreground">{t('giftCard.description')}</p>

        </div>

      </div>



      <Tabs value={tab} onValueChange={setTab} className="flex-1">

        <TabsList className="grid h-9 w-full grid-cols-4">

          <TabsTrigger value="templates">{t('giftCard.tabs.templates')}</TabsTrigger>

          <TabsTrigger value="codes">{t('giftCard.tabs.codes')}</TabsTrigger>

          <TabsTrigger value="usages">{t('giftCard.tabs.usages')}</TabsTrigger>

          <TabsTrigger value="statistics">{t('giftCard.tabs.statistics')}</TabsTrigger>

        </TabsList>



        <TabsContent value="templates" className="mt-6 flex-1">

          <div className="space-y-4">

            <div className="flex items-center justify-between">

              <div>

                <h3 className="text-lg font-medium">{t('giftCard.template.title')}</h3>

                <p className="text-sm text-muted-foreground">{t('giftCard.template.description')}</p>

              </div>

            </div>

            <div className="flex items-center justify-between">

              <Input

                className="h-8 w-full min-w-[150px] sm:w-[150px] lg:w-[250px]"

                placeholder={t('giftCard.common.search')}

                value={search}

                onChange={(e) => setSearch(e.target.value)}

              />

              <div className="flex items-center space-x-2">

                <Button variant="outline" size="sm" className="h-8 rounded-md px-3 text-xs" onClick={openCreate}>

                  <Plus className="mr-2 h-4 w-4" />

                  {t('giftCard.template.form.add')}

                </Button>

                <Button variant="outline" size="sm" className="ml-auto hidden h-8 rounded-md px-3 text-xs lg:flex">

                  <SlidersHorizontal className="mr-2 h-4 w-4" />

                  {t('common.table.viewOptions.button')}

                </Button>

              </div>

            </div>

            <DataTable

              columns={templateColumns}

              data={filteredTemplates}

              loading={loading}

              pageSize={20}

              alwaysShowPagination

              tableClassName="relative overflow-auto rounded-md border bg-card"

            />

          </div>

        </TabsContent>



        <TabsContent value="codes" className="mt-6 flex-1">

          <DataTable

            columns={codeColumns}

            data={codes}

            loading={loading}

            pageSize={listPageSize}

            alwaysShowPagination

            totalItems={codesTotal}

            pageIndex={codesPage - 1}

            pageCount={codesPageCount}

            onPageIndexChange={(idx) => setCodesPage(idx + 1)}

          />

        </TabsContent>



        <TabsContent value="usages" className="mt-6 flex-1">

          <DataTable

            columns={usageColumns}

            data={usages}

            loading={loading}

            pageSize={listPageSize}

            alwaysShowPagination

            totalItems={usagesTotal}

            pageIndex={usagesPage - 1}

            pageCount={usagesPageCount}

            onPageIndexChange={(idx) => setUsagesPage(idx + 1)}

          />

        </TabsContent>



        <TabsContent value="statistics" className="mt-6 flex-1">

          {loading ? (

            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

          ) : (

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              {Object.entries(stats).map(([key, value]) => (

                <div key={key} className="rounded-lg border p-4">

                  <p className="text-sm text-muted-foreground">{key}</p>

                  <p className="text-2xl font-semibold">{String(value)}</p>

                </div>

              ))}

            </div>

          )}

        </TabsContent>

      </Tabs>



      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>

        <DialogContent className="!flex h-[810px] max-h-[810px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[576px]">

          <DialogHeader className="shrink-0 space-y-1.5 border-b px-6 pb-4 pt-6 text-left">

            <DialogTitle className="text-lg tracking-tight">

              {dialogMode === 'edit' ? t('giftCard.template.form.edit') : t('giftCard.template.form.add')}

            </DialogTitle>

          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto bg-background">

            <div className="space-y-6 px-6 py-4 text-sm">

              <div className="space-y-4 rounded-xl border bg-card/50 p-4">

                <div className="mb-2 flex items-center gap-2">

                  <Globe className="h-4 w-4 text-primary" />

                  <h3 className="text-sm font-semibold">{t('giftCard.template.form.basic.title')}</h3>

                </div>

                <div className="grid grid-cols-2 gap-4">

                  <div className="space-y-1.5">

                    <Label className={dialogFieldLabelCls}>{t('giftCard.template.form.name.label')}</Label>

                    <input

                      className={`${inputCls} ${dialogInputCls}`}

                      placeholder={t('giftCard.template.form.name.placeholder')}

                      value={form.name}

                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}

                    />

                  </div>

                  <div className="space-y-1.5">

                    <Label className={dialogFieldLabelCls}>{t('giftCard.template.form.type.label')}</Label>

                    <FormSelect
                      className={dialogInputCls}
                      value={String(form.type)}
                      onChange={(v) => setForm((f) => ({ ...f, type: Number(v) }))}
                      options={giftTypeOptions.map(({ id, label }) => ({
                        value: String(id),
                        label,
                      }))}
                    />

                  </div>

                </div>

                <div className="space-y-1.5">

                  <Label className={dialogFieldLabelCls}>{t('giftCard.template.form.description.label')}</Label>

                  <textarea

                    className={`${textareaCls} min-h-[80px] font-mono text-xs`}

                    placeholder={t('giftCard.template.form.description.placeholder')}

                    value={form.description}

                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}

                  />

                </div>

                <div className="grid grid-cols-2 gap-4">

                  <div className="xb-stack-2">

                    <Label className={dialogFieldLabelCls}>{t('giftCard.template.form.sort.label')}</Label>

                    <input

                      type="number"

                      className={`${inputCls} ${dialogInputCls}`}

                      placeholder={t('giftCard.template.form.sort.placeholder')}

                      value={form.sort}

                      onChange={(e) => setForm((f) => ({ ...f, sort: Number(e.target.value) }))}

                    />

                  </div>

                  <div className="flex flex-row items-center justify-between rounded-md border border-dashed p-3">

                    <div className="xb-stack-05">

                      <Label className="text-xs font-semibold">{t('giftCard.template.form.status.label')}</Label>

                      <p className="text-[10px] text-muted-foreground">

                        {t('giftCard.template.form.status.description')}

                      </p>

                    </div>

                    <Switch

                      checked={form.status === 1}

                      onCheckedChange={(v) => setForm((f) => ({ ...f, status: v ? 1 : 0 }))}

                    />

                  </div>

                </div>

              </div>



              <div className="space-y-4 rounded-xl border bg-card/50 p-4">

                <div className="mb-2 flex items-center gap-2">

                  <Gift className="h-4 w-4 text-primary" />

                  <h3 className="text-sm font-semibold">{t('giftCard.template.form.rewards.title')}</h3>

                </div>

                {form.type === 2 ? (

                  <div className="grid grid-cols-2 gap-4">

                    <div className="xb-stack-2">

                      <Label className={dialogFieldLabelCls}>{t('giftCard.template.form.rewards.plan_id.label')}</Label>

                      <select

                        className={inputCls}

                        value={form.rewards.plan_id ?? ''}

                        onChange={(e) =>

                          setForm((f) => ({

                            ...f,

                            rewards: {

                              ...f.rewards,

                              plan_id: e.target.value ? Number(e.target.value) : null,

                            },

                          }))

                        }

                      >

                        <option value="">{t('giftCard.template.form.rewards.plan_id.placeholder')}</option>

                        {plans.map((p) => (

                          <option key={p.id} value={p.id}>

                            {p.name}

                          </option>

                        ))}

                      </select>

                    </div>

                    <div className="xb-stack-2">

                      <Label className={dialogFieldLabelCls}>{t('giftCard.template.form.rewards.plan_validity_days.label')}</Label>

                      <SuffixInput

                        suffix={t('common.days')}

                        type="number"

                        placeholder={t('giftCard.template.form.rewards.plan_validity_days.placeholder')}

                        value={form.rewards.plan_validity_days ?? ''}

                        onChange={(e) =>

                          setForm((f) => ({

                            ...f,

                            rewards: {

                              ...f.rewards,

                              plan_validity_days: e.target.value ? Number(e.target.value) : null,

                            },

                          }))

                        }

                      />

                    </div>

                  </div>

                ) : (

                  <>

                    <div className="grid grid-cols-2 gap-4">

                      <div className="xb-stack-2">

                        <Label className={dialogFieldLabelCls}>{t('giftCard.template.form.rewards.balance.label')}</Label>

                        <SuffixInput

                          suffix="¥"

                          type="number"

                          placeholder={t('giftCard.template.form.rewards.balance.placeholder')}

                          value={form.rewards.balance ?? 0}

                          onChange={(e) =>

                            setForm((f) => ({

                              ...f,

                              rewards: { ...f.rewards, balance: Number(e.target.value) },

                            }))

                          }

                        />

                      </div>

                      <div className="xb-stack-2">

                        <Label className={dialogFieldLabelCls}>{t('giftCard.template.form.rewards.transfer_enable.label')}</Label>

                        <SuffixInput

                          suffix="GB"

                          type="number"

                          placeholder={t('giftCard.template.form.rewards.transfer_enable.placeholder')}

                          value={form.rewards.transfer_enable ?? ''}

                          onChange={(e) =>

                            setForm((f) => ({

                              ...f,

                              rewards: {

                                ...f.rewards,

                                transfer_enable: e.target.value ? Number(e.target.value) : undefined,

                              },

                            }))

                          }

                        />

                      </div>

                      <div className="xb-stack-2">

                        <Label className={dialogFieldLabelCls}>{t('giftCard.template.form.rewards.expire_days.label')}</Label>

                        <SuffixInput

                          suffix={t('common.days')}

                          type="number"

                          placeholder={t('giftCard.template.form.rewards.expire_days.placeholder')}

                          value={form.rewards.expire_days ?? ''}

                          onChange={(e) =>

                            setForm((f) => ({

                              ...f,

                              rewards: {

                                ...f.rewards,

                                expire_days: e.target.value ? Number(e.target.value) : undefined,

                              },

                            }))

                          }

                        />

                      </div>

                      <div className="xb-stack-2">

                        <Label className={dialogFieldLabelCls}>{t('giftCard.template.form.rewards.device_limit.label')}</Label>

                        <input

                          type="number"

                          className={inputCls}

                          placeholder={t('giftCard.template.form.rewards.device_limit.placeholder')}

                          value={form.rewards.device_limit ?? ''}

                          onChange={(e) =>

                            setForm((f) => ({

                              ...f,

                              rewards: {

                                ...f.rewards,

                                device_limit: e.target.value ? Number(e.target.value) : undefined,

                              },

                            }))

                          }

                        />

                      </div>

                    </div>

                    <div className="flex items-center gap-2">

                      <Switch

                        checked={Boolean(form.rewards.reset_package)}

                        onCheckedChange={(v) =>

                          setForm((f) => ({

                            ...f,

                            rewards: { ...f.rewards, reset_package: v },

                          }))

                        }

                      />

                      <Label>{t('giftCard.template.form.rewards.reset_package.label')}</Label>

                    </div>

                  </>

                )}

              </div>



              <div className="space-y-4 rounded-xl border bg-card/50 p-4">

                <div className="mb-2 flex items-center gap-2">

                  <Target className="h-4 w-4 text-primary" />

                  <h3 className="text-sm font-semibold">{t('giftCard.template.form.conditions.title')}</h3>

                </div>

                <div className="space-y-1.5">

                  <Label className={dialogFieldLabelCls}>{t('giftCard.template.form.conditions.new_user_max_days.label')}</Label>

                  <SuffixInput

                    className={dialogInputCls}

                    suffix={t('common.days')}

                    type="number"

                    placeholder={t('giftCard.template.form.conditions.new_user_max_days.placeholder')}

                    value={form.conditions.new_user_max_days ?? ''}

                    onChange={(e) =>

                      setForm((f) => ({

                        ...f,

                        conditions: {

                          ...f.conditions,

                          new_user_max_days: e.target.value ? Number(e.target.value) : null,

                        },

                      }))

                    }

                  />

                </div>

                <div className="flex items-center gap-2">

                  <Switch

                    checked={Boolean(form.conditions.new_user_only)}

                    onCheckedChange={(v) =>

                      setForm((f) => ({

                        ...f,

                        conditions: { ...f.conditions, new_user_only: v },

                      }))

                    }

                  />

                  <Label>{t('giftCard.template.form.conditions.new_user_only.label')}</Label>

                </div>

                <div className="flex items-center gap-2">

                  <Switch

                    checked={Boolean(form.conditions.paid_user_only)}

                    onCheckedChange={(v) =>

                      setForm((f) => ({

                        ...f,

                        conditions: { ...f.conditions, paid_user_only: v },

                      }))

                    }

                  />

                  <Label>{t('giftCard.template.form.conditions.paid_user_only.label')}</Label>

                </div>

                <div className="flex items-center gap-2">

                  <Switch

                    checked={Boolean(form.conditions.require_invite)}

                    onCheckedChange={(v) =>

                      setForm((f) => ({

                        ...f,

                        conditions: { ...f.conditions, require_invite: v },

                      }))

                    }

                  />

                  <Label>{t('giftCard.template.form.conditions.require_invite.label')}</Label>

                </div>

                <div className="xb-stack-2">

                  <Label>{t('giftCard.template.form.conditions.allowed_plans.label')}</Label>

                  <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-md border p-2">

                    {plans.map((p) => (

                      <label key={p.id} className="flex items-center gap-1 text-xs">

                        <input

                          type="checkbox"

                          checked={form.conditions.allowed_plans?.includes(Number(p.id)) ?? false}

                          onChange={() => togglePlanInCondition('allowed_plans', Number(p.id))}

                        />

                        {p.name}

                      </label>

                    ))}

                  </div>

                </div>

                <div className="xb-stack-2">

                  <Label>{t('giftCard.template.form.conditions.disallowed_plans.label')}</Label>

                  <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-md border p-2">

                    {plans.map((p) => (

                      <label key={p.id} className="flex items-center gap-1 text-xs">

                        <input

                          type="checkbox"

                          checked={form.conditions.disallowed_plans?.includes(Number(p.id)) ?? false}

                          onChange={() => togglePlanInCondition('disallowed_plans', Number(p.id))}

                        />

                        {p.name}

                      </label>

                    ))}

                  </div>

                </div>

              </div>

            </div>

          </div>

          <DialogFormFooter
            onCancel={() => setDialogOpen(false)}
            onSubmit={saveTemplate}
            cancelLabel={t('common.cancel')}
            submitLabel={t('common.confirm')}
            submitting={saving}
          />

        </DialogContent>

      </Dialog>



      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>

        <DialogContent>

          <DialogHeader>

            <DialogTitle>{t('giftCard.code.generate.title')}</DialogTitle>

          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">

            <div className="flex flex-col gap-2">

              <Label>{t('giftCard.code.generate.count')}</Label>

              <input

                className={inputCls}

                type="number"

                min={1}

                max={10000}

                value={generateForm.count}

                onChange={(e) => setGenerateForm((f) => ({ ...f, count: Number(e.target.value) }))}

              />

            </div>

            <div className="flex flex-col gap-2">

              <Label>{t('giftCard.code.generate.prefix')}</Label>

              <input

                className={inputCls}

                value={generateForm.prefix}

                onChange={(e) => setGenerateForm((f) => ({ ...f, prefix: e.target.value.toUpperCase() }))}

              />

            </div>

            <div className="flex flex-col gap-2">

              <Label>{t('giftCard.code.generate.expires_hours')}</Label>

              <input

                className={inputCls}

                type="number"

                value={generateForm.expires_hours}

                onChange={(e) => setGenerateForm((f) => ({ ...f, expires_hours: e.target.value }))}

              />

            </div>

            <div className="flex flex-col gap-2">

              <Label>{t('giftCard.code.generate.max_usage')}</Label>

              <input

                className={inputCls}

                type="number"

                min={1}

                value={generateForm.max_usage}

                onChange={(e) => setGenerateForm((f) => ({ ...f, max_usage: Number(e.target.value) }))}

              />

            </div>

            <div className="flex items-center gap-2">

              <Switch

                id="gift-download-csv"

                checked={generateForm.download_csv}

                onCheckedChange={(v) => setGenerateForm((f) => ({ ...f, download_csv: v }))}

              />

              <Label htmlFor="gift-download-csv">

                {t('giftCard.code.form.download_csv')}

              </Label>

            </div>

          </div>

          <DialogFooter>

            <Button variant="outline" onClick={() => setGenerateOpen(false)}>

              {t('common.cancel')}

            </Button>

            <Button onClick={generateCodes} disabled={generating}>

              {t('common.confirm')}

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>



      <Dialog open={codeEditOpen} onOpenChange={setCodeEditOpen}>

        <DialogContent className="sm:max-w-md">

          <DialogHeader>

            <DialogTitle>

              {t('giftCard.template.actions.edit')}

            </DialogTitle>

          </DialogHeader>

          {codeEditForm ? (

            <div className="flex flex-col gap-4 py-2">

              <div className="flex flex-col gap-2">

                <Label>{t('giftCard.code.table.columns.code')}</Label>

                <input className={inputCls} value={codeEditForm.code} readOnly disabled />

              </div>

              <div className="flex flex-col gap-2">

                <Label>{t('giftCard.code.table.columns.status')}</Label>

                <select

                  className={inputCls}

                  value={codeEditForm.status}

                  onChange={(e) =>

                    setCodeEditForm((f) => (f ? { ...f, status: Number(e.target.value) } : f))

                  }

                >

                  {[0, 1, 2, 3].map((value) => (

                    <option key={value} value={value}>

                      {t(`giftCard.code.status.${value}`)}

                    </option>

                  ))}

                </select>

              </div>

              <div className="flex flex-col gap-2">

                <Label>{t('giftCard.code.form.max_usage.label')}</Label>

                <input

                  type="number"

                  min={1}

                  max={1000}

                  className={inputCls}

                  value={codeEditForm.max_usage}

                  onChange={(e) =>

                    setCodeEditForm((f) => (f ? { ...f, max_usage: Number(e.target.value) } : f))

                  }

                />

              </div>

              <div className="flex flex-col gap-2">

                <Label>{t('giftCard.code.table.columns.expires_at')}</Label>

                <input

                  type="datetime-local"

                  className={inputCls}

                  value={codeEditForm.expires_at_input}

                  onChange={(e) =>

                    setCodeEditForm((f) => (f ? { ...f, expires_at_input: e.target.value } : f))

                  }

                />

                <p className="text-xs text-muted-foreground">

                  {t('giftCard.template.form.limits.max_use_per_user.placeholder')}

                </p>

              </div>

            </div>

          ) : null}

          <DialogFooter>

            <Button variant="outline" onClick={() => setCodeEditOpen(false)}>

              {t('common.cancel')}

            </Button>

            <Button onClick={saveCode} disabled={codeEditSaving || !codeEditForm}>

              {t('common.save')}

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

      <ConfirmDialog />

    </div>

  )

}


