<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { NCard, NDataTable, NButton, useMessage, type DataTableColumns } from 'naive-ui'
import { fetchOrders, cancelOrder, checkoutOrder, type OrderItem } from '@/api/order'
import { useI18n } from '@/i18n'

const rows = ref<OrderItem[]>([])
const msg = useMessage()
const { t } = useI18n()

async function pay(tradeNo: string) {
  try {
    const res = await checkoutOrder(tradeNo)
    if (res.type === 1) window.open(res.data, '_blank')
    else msg.info(res.data)
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : 'Failed')
  }
}

async function cancel(tradeNo: string) {
  try {
    await cancelOrder(tradeNo)
    msg.success('Cancelled')
    rows.value = await fetchOrders()
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : 'Failed')
  }
}

const columns: DataTableColumns<OrderItem> = [
  { title: 'Trade No', key: 'trade_no' },
  { title: 'Plan', key: 'plan', render: (r) => r.plan?.name ?? String(r.plan_id) },
  { title: 'Amount', key: 'total_amount', render: (r) => `¥${(r.total_amount / 100).toFixed(2)}` },
  { title: 'Status', key: 'status' },
  {
    title: 'Actions',
    key: 'actions',
    render: (row) =>
      row.status === 0
        ? [
            h(NButton, { size: 'small', onClick: () => pay(row.trade_no) }, () => 'Pay'),
            h(NButton, { size: 'small', quaternary: true, style: 'margin-left:8px', onClick: () => cancel(row.trade_no) }, () => 'Cancel'),
          ]
        : '—',
  },
]

onMounted(async () => {
  rows.value = await fetchOrders()
})
</script>

<template>
  <h2 class="page-title">{{ t('nav.order') }}</h2>
  <n-card>
    <n-data-table :columns="columns" :data="rows" :bordered="false" />
  </n-card>
</template>
