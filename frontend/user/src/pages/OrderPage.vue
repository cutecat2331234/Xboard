<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NDataTable, NTag, useMessage, useDialog, type DataTableColumns } from 'naive-ui'
import { fetchOrders, cancelOrder, type OrderItem } from '@/api/order'
import { PERIOD_OPTIONS } from '@/api/plan'
import { orderStatusLabel } from '@/lib/order-status'
import { formatLocaleDateTime } from '@/lib/format-date'
import { useI18n } from '@/i18n'
import { useCurrency } from '@/composables/useCurrency'

const router = useRouter()
const rows = ref<OrderItem[]>([])
const loading = ref(true)
const msg = useMessage()
const dialog = useDialog()
const { t, locale } = useI18n()
const { formatPrice, load: loadCurrency } = useCurrency()

function periodLabel(period?: string) {
  if (!period) return ''
  const hit = PERIOD_OPTIONS.find((o) => o.key === period)
  return hit ? t(hit.labelKey) : period
}

function renderTradeNoCell(row: OrderItem) {
  const tradeNo = row.trade_no
  return h(
    'button',
    {
      type: 'button',
      class: 'order-link-btn color-primary',
      onClick: () => router.push(`/order/${tradeNo}`),
    },
    tradeNo,
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
    render: (row) => formatPrice(row.total_amount),
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
    render: (row) => formatLocaleDateTime(row.created_at, locale.value),
  },
  {
    title: t('common.actions'),
    key: 'actions',
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'order-actions' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'order-link-btn',
            onClick: () => router.push(`/order/${row.trade_no}`),
          },
          t('order.viewDetail'),
        ),
        h('span', { class: 'order-actions-divider' }),
        h(
          'button',
          {
            type: 'button',
            class: 'order-link-btn',
            disabled: row.status !== 0,
            onClick: () => confirmCancel(row.trade_no),
          },
          t('common.cancel'),
        ),
      ]),
  },
])

onMounted(async () => {
  loading.value = true
  try {
    await loadCurrency()
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
