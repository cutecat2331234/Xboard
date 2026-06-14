<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NDataTable, NDivider, NEmpty, NSelect, NTag, useMessage, useDialog, type DataTableColumns } from 'naive-ui'
import { fetchOrders, cancelOrder, type OrderItem, canCancelOrder } from '@/api/order'
import { PERIOD_OPTIONS } from '@/api/plan'
import { ORDER_STATUS_KEYS, orderStatusLabel } from '@/lib/order-status'
import { formatFixedDateTime } from '@/lib/format-date'
import { useI18n } from '@/i18n'
import { resolveApiError } from '@/lib/api-errors'
import { useCurrency } from '@/composables/useCurrency'

const router = useRouter()
const rows = ref<OrderItem[]>([])
const loading = ref(true)
const statusFilter = ref<number | null>(null)
const msg = useMessage()
const dialog = useDialog()
const { t } = useI18n()
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

const statusOptions = computed(() => [
  { label: t('order.filterAll'), value: null as number | null },
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
    render: (row) => formatFixedDateTime(row.created_at),
  },
  {
    title: t('common.actions'),
    key: 'actions',
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'order-actions' }, [
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
    rows.value = await fetchOrders(statusFilter.value ?? undefined)
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t, t('errors.requestFailed')))
  } finally {
    loading.value = false
  }
}

watch(statusFilter, () => {
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
    <n-empty v-if="!loading && rows.length === 0" :description="t('order.empty')" />
    <n-data-table
      v-else
      class="order-list-table"
      :columns="columns"
      :data="rows"
      :bordered="false"
      :scroll-x="960"
      :loading="loading"
    />
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
