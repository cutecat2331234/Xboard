<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NDataTable, NDivider, NSelect, NTag, useMessage, useDialog, type DataTableColumns, type SelectOption } from 'naive-ui'
import { fetchOrders, cancelOrder, fetchFirstBlockingOrder, type OrderItem, canCancelOrder } from '@/api/order'
import { PERIOD_OPTIONS } from '@/api/plan'
import { ORDER_STATUS_KEYS, orderStatusLabel } from '@/lib/order-status'
import { formatLocaleDateTime } from '@/lib/format-date'
import { useI18n } from '@/i18n'
import { resolveApiError } from '@/lib/api-errors'
import { useCurrency } from '@/composables/useCurrency'

const router = useRouter()
const rows = ref<OrderItem[]>([])
const loading = ref(true)
const statusFilter = ref<number | null>(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const msg = useMessage()
const dialog = useDialog()
const { t, locale } = useI18n()
const { formatPrice, load: loadCurrency } = useCurrency()

function formatOrderAmount(cents: number) {
  return formatPrice(cents)
}

function orderStatusDotClass(status: number) {
  if (status === 3) return 'status-dot status-dot--ok'
  if (status === 4) return 'status-dot status-dot--info'
  if (status === 1) return 'status-dot status-dot--info'
  if (status === 0) return 'status-dot status-dot--warn'
  return 'status-dot status-dot--bad'
}

function periodLabel(period?: string) {
  if (!period) return ''
  const hit = PERIOD_OPTIONS.find((o) => o.key === period)
  return hit ? t(hit.labelKey) : period
}

const statusOptions = computed<SelectOption[]>(() => [
  { label: t('order.filterAll'), value: null as unknown as number },
  ...Object.entries(ORDER_STATUS_KEYS).map(([value, key]) => ({
    label: t(key),
    value: Number(value),
  })),
])

function renderTradeNoCell(row: OrderItem) {
  const tradeNo = row.trade_no
  return h(
    NButton,
    {
      text: true,
      class: 'color-primary',
      onClick: () => router.push(`/order/${tradeNo}`),
    },
    { default: () => tradeNo },
  )
}

function confirmCancel(tradeNo: string) {
  dialog.info({
    title: t('order.notice'),
    content: t('order.closeConfirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      try {
        await cancelOrder(tradeNo)
        msg.success(t('order.closeSuccess'))
        await loadOrders()
      } catch (e: unknown) {
        msg.error(resolveApiError(e, t, t('errors.cancelFailed')))
      }
    },
  })
}

const columns = computed<DataTableColumns<OrderItem>>(() => [
  {
    title: t('order.listTradeNo'),
    key: 'trade_no',
    render: (row) => renderTradeNoCell(row),
  },
  {
    title: t('order.productName'),
    key: 'plan',
    render: (row) => row.plan?.name ?? '—',
  },
  {
    title: t('order.period'),
    key: 'period',
    render: (row) => h(NTag, { round: true, size: 'small' }, () => periodLabel(row.period)),
  },
  {
    title: t('order.amount'),
    key: 'total_amount',
    render: (row) => formatOrderAmount(row.total_amount),
  },
  {
    title: t('order.status'),
    key: 'status',
    render: (row) =>
      h('div', { class: 'flex items-center' }, [
        h('div', {
          class: orderStatusDotClass(row.status),
        }),
        t(orderStatusLabel(row.status)),
      ]),
  },
  {
    title: t('order.createdAt'),
    key: 'created_at',
    render: (row) => formatLocaleDateTime(row.created_at, locale.value),
  },
  {
    title: t('common.actions'),
    key: 'actions',
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'order-actions' }, [
        row.status === 0
          ? h(
              NButton,
              {
                text: true,
                type: 'primary',
                onClick: () => router.push(`/order/${row.trade_no}`),
              },
              { default: () => t('order.pay') },
            )
          : null,
        row.status === 0 ? h(NDivider, { vertical: true }) : null,
        h(
          NButton,
          {
            text: true,
            type: 'primary',
            onClick: () => router.push(`/order/${row.trade_no}`),
          },
          { default: () => t('order.viewDetail') },
        ),
        h(NDivider, { vertical: true }),
        h(
          NButton,
          {
            text: true,
            type: 'primary',
            disabled: !canCancelOrder(row),
            onClick: () => confirmCancel(row.trade_no),
          },
          { default: () => t('common.cancel') },
        ),
      ]),
  },
])

async function loadOrders() {
  loading.value = true
  try {
    const res = await fetchOrders({
      status: statusFilter.value ?? undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    rows.value = res.data ?? []
    total.value = res.total ?? 0
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t, t('errors.requestFailed')))
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
  void loadOrders()
}

function onPageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  void loadOrders()
}

watch(statusFilter, () => {
  page.value = 1
  void loadOrders()
})

onMounted(async () => {
  try {
    await loadCurrency()
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t, t('errors.requestFailed')))
  }
  await loadOrders()
})
</script>

<template>
  <div class="order-page">
    <div class="order-page__toolbar">
      <n-select
        v-model:value="statusFilter"
        :options="statusOptions"
        :placeholder="t('order.filterAll')"
        class="order-page__filter"
        clearable
      />
    </div>
    <n-data-table
      remote
      class="order-list-table"
      :columns="columns"
      :data="rows"
      :bordered="false"
      :scroll-x="960"
      :loading="loading"
      :pagination="{
        page,
        pageSize,
        itemCount: total,
        showSizePicker: true,
        pageSizes: [10, 20, 50],
        onUpdatePage: onPageChange,
        onUpdatePageSize: onPageSizeChange,
      }"
    >
      <template #empty>{{ t('order.empty') }}</template>
    </n-data-table>
  </div>
</template>

<style scoped>
.order-page__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}
.order-page__filter {
  width: 200px;
  max-width: 100%;
}
</style>
