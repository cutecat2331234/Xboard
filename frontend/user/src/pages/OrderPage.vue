<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard,
  NDataTable,
  NEmpty,
  NIcon,
  NPagination,
  NPopover,
  NTag,
  useMessage,
  useDialog,
  type DataTableColumns,
  type PaginationInfo,
} from 'naive-ui'
import { CopyOutline } from '@vicons/ionicons5'
import { fetchOrders, cancelOrder, type OrderItem } from '@/api/order'
import { PERIOD_OPTIONS } from '@/api/plan'
import { orderStatusLabel } from '@/lib/order-status'
import { formatLocaleDateTime } from '@/lib/format-date'
import { useI18n } from '@/i18n'
import { useCurrency } from '@/composables/useCurrency'

const ORDER_PAGE_SIZE = 20

const router = useRouter()
const rows = ref<OrderItem[]>([])
const page = ref(1)
const loading = ref(true)
const msg = useMessage()
const dialog = useDialog()
const { t, locale } = useI18n()
const { formatPrice, load: loadCurrency } = useCurrency()

const showPagination = computed(() => rows.value.length > ORDER_PAGE_SIZE)

const paginatedRows = computed(() => {
  if (!showPagination.value) return rows.value
  const start = (page.value - 1) * ORDER_PAGE_SIZE
  return rows.value.slice(start, start + ORDER_PAGE_SIZE)
})

function paginationPrefix(info: PaginationInfo) {
  const pageCount = Math.max(1, Math.ceil(info.itemCount / info.pageSize))
  return t('common.pagination.summary', {
    current: info.page,
    total: pageCount,
    count: info.itemCount,
  })
}

watch(
  () => rows.value.length,
  () => {
    const maxPage = Math.max(1, Math.ceil(rows.value.length / ORDER_PAGE_SIZE))
    if (page.value > maxPage) page.value = maxPage
  },
)

function periodLabel(period?: string) {
  if (!period) return ''
  const hit = PERIOD_OPTIONS.find((o) => o.key === period)
  return hit ? t(hit.labelKey) : period
}

async function copyTradeNo(tradeNo: string) {
  try {
    await navigator.clipboard.writeText(tradeNo)
    msg.success(t('order.tradeNoCopied'))
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : t('common.error'))
  }
}

function renderTradeNoCell(row: OrderItem) {
  const tradeNo = row.trade_no
  return h('div', { class: 'order-trade-no-cell' }, [
    h(
      NPopover,
      { trigger: 'hover', placement: 'top', showArrow: false },
      {
        trigger: () =>
          h(
            'button',
            {
              type: 'button',
              class: 'order-link-btn order-trade-no-text',
              onClick: () => router.push(`/order/${tradeNo}`),
            },
            tradeNo,
          ),
        default: () => h('span', { class: 'order-trade-no-popover' }, tradeNo),
      },
    ),
    h(
      'button',
      {
        type: 'button',
        class: 'order-trade-no-copy',
        title: t('order.copyTradeNo'),
        'aria-label': t('order.copyTradeNo'),
        onClick: (e: MouseEvent) => {
          e.stopPropagation()
          void copyTradeNo(tradeNo)
        },
      },
      [h(NIcon, { size: 14 }, { default: () => h(CopyOutline) })],
    ),
  ])
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
    width: 200,
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
  <div v-else class="order-list">
    <n-data-table
      :columns="columns"
      :data="paginatedRows"
      :bordered="false"
      :scroll-x="800"
      :loading="loading"
    />
    <n-pagination
      v-if="showPagination"
      v-model:page="page"
      class="order-pagination"
      :item-count="rows.length"
      :page-size="ORDER_PAGE_SIZE"
      :prefix="paginationPrefix"
    />
  </div>
</template>

<style scoped>
.order-list {
  display: flex;
  flex-direction: column;
}
.order-pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
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
.order-trade-no-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  min-width: 0;
}
.order-trade-no-text {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
  min-width: 0;
  display: inline-block;
  vertical-align: bottom;
}
.order-trade-no-copy {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  color: #316c72;
  cursor: pointer;
  padding: 0;
  border-radius: 3px;
}
.order-trade-no-copy:hover {
  background: var(--xb-hover);
}
.order-trade-no-popover {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
  word-break: break-all;
  max-width: 320px;
}
</style>
