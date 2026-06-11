<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard,
  NDataTable,
  NEmpty,
  NTag,
  useMessage,
  useDialog,
  type DataTableColumns,
} from 'naive-ui'
import { fetchOrders, cancelOrder, type OrderItem } from '@/api/order'
import { PERIOD_OPTIONS } from '@/api/plan'
import { orderStatusLabel } from '@/lib/order-status'
import { useI18n } from '@/i18n'
import { useCurrency } from '@/composables/useCurrency'

const router = useRouter()
const rows = ref<OrderItem[]>([])
const loading = ref(true)
const msg = useMessage()
const dialog = useDialog()
const { t } = useI18n()
const { formatPrice, load: loadCurrency } = useCurrency()

function periodLabel(period?: string) {
  if (!period) return ''
  const hit = PERIOD_OPTIONS.find((o) => o.key === period)
  return hit ? t(hit.labelKey) : period
}

function formatTime(ts?: number) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function confirmCancel(tradeNo: string) {
  dialog.warning({
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
    render: (row) =>
      h(
        'button',
        {
          type: 'button',
          class: 'order-link-btn',
          onClick: () => router.push(`/order/${row.trade_no}`),
        },
        row.trade_no,
      ),
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
          class: [
            'order-status-dot',
            row.status === 3 ? 'order-status-dot--ok' : 'order-status-dot--bad',
          ],
        }),
        t(orderStatusLabel(row.status)),
      ]),
  },
  {
    title: t('order.createdAt'),
    key: 'created_at',
    render: (row) => formatTime(row.created_at),
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
        ...(row.status === 0
          ? [
              h('span', { class: 'order-actions-divider' }),
              h(
                'button',
                {
                  type: 'button',
                  class: 'order-link-btn',
                  onClick: () => router.push(`/order/${row.trade_no}`),
                },
                t('order.pay'),
              ),
            ]
          : []),
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
  <n-card v-if="!loading && rows.length === 0">
    <n-empty :description="t('order.empty')" />
  </n-card>
  <n-data-table
    v-else
    :columns="columns"
    :data="rows"
    :bordered="false"
    :scroll-x="800"
    :loading="loading"
  />
</template>

<style scoped>
.order-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  margin-right: 5px;
}
.order-status-dot--ok {
  background: #22c55e;
}
.order-status-dot--bad {
  background: #ef4444;
}
.order-actions {
  display: flex;
  align-items: center;
}
.flex {
  display: flex;
}
.items-center {
  align-items: center;
}
</style>
