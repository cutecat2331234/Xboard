<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NDataTable, NDivider, NTag, useMessage, useDialog, type DataTableColumns } from 'naive-ui'
import { fetchOrders, cancelOrder, type OrderItem } from '@/api/order'
import { PERIOD_OPTIONS } from '@/api/plan'
import { orderStatusLabel } from '@/lib/order-status'
import { formatFixedDateTime } from '@/lib/format-date'
import { useI18n } from '@/i18n'
const router = useRouter()
const rows = ref<OrderItem[]>([])
const loading = ref(true)
const msg = useMessage()
const dialog = useDialog()
const { t } = useI18n()
function formatOrderAmount(cents: number) {
  const value = typeof cents === 'string' ? parseFloat(cents) : cents
  if (!Number.isFinite(value)) return '0.00'
  return (value / 100).toFixed(2)
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
      await cancelOrder(tradeNo)
      msg.success(t('order.closeSuccess'))
      rows.value = await fetchOrders()
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
          class: ['status-dot', row.status === 3 ? 'status-dot--ok' : 'status-dot--bad'],
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
            disabled: row.status !== 0,
            onClick: () => confirmCancel(row.trade_no),
          },
          { default: () => t('common.cancel') },
        ),
      ]),
  },
])

onMounted(async () => {
  loading.value = true
  try {
    rows.value = await fetchOrders()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <n-data-table
    class="order-list-table"
    :columns="columns"
    :data="rows"
    :bordered="false"
    :scroll-x="800"
    :loading="loading"
  />
</template>
