<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NDataTable, NDivider, NEmpty, NTag, useMessage, useDialog, type DataTableColumns } from 'naive-ui'
import { fetchOrders, cancelOrder, type OrderItem, canCancelOrder } from '@/api/order'
import { PERIOD_OPTIONS } from '@/api/plan'
import { ORDER_STATUS_KEYS, orderStatusLabel } from '@/lib/order-status'
import { formatPanelDateTime } from '@/lib/format-date'
import { useI18n } from '@/i18n'
import { resolveApiError } from '@/lib/api-errors'
import { useCurrency } from '@/composables/useCurrency'

const router = useRouter()
const rows = ref<OrderItem[]>([])
const loading = ref(true)
const page = ref(1)
const pageSize = ref(50)
const total = ref(0)
const msg = useMessage()
const dialog = useDialog()
const { t } = useI18n()
const { formatAmount, load: loadCurrency } = useCurrency()

function formatOrderAmount(cents: number) {
  return formatAmount(cents)
}

function orderStatusDotClass(_status: number) {
  return 'status-dot status-dot--bad'
}

function periodLabel(period?: string) {
  if (!period) return ''
  const hit = PERIOD_OPTIONS.find((o) => o.key === period)
  return hit ? t(hit.labelKey) : period
}

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
    width: 296,
    render: (row) => renderTradeNoCell(row),
  },
  {
    title: t('order.period'),
    key: 'period',
    width: 110,
    render: (row) => h(NTag, { round: true, size: 'small' }, () => periodLabel(row.period)),
  },
  {
    title: t('order.amount'),
    key: 'total_amount',
    width: 121,
    render: (row) => formatOrderAmount(row.total_amount),
  },
  {
    title: t('order.status'),
    key: 'status',
    width: 158,
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
    width: 168,
    render: (row) => formatPanelDateTime(row.created_at),
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: 176,
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
    const res = await fetchOrders({
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
    <n-empty v-if="!loading && rows.length === 0" :description="t('order.empty')" />
    <n-data-table
      v-else
      class="order-list-table"
      :columns="columns"
      :data="rows"
      :bordered="false"
      :loading="loading"
      :pagination="false"
    />
  </div>
</template>
