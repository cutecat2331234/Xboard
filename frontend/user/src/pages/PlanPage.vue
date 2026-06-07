<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NCard, NGrid, NGi, NButton, NTag, NEmpty, useMessage } from 'naive-ui'
import { fetchPlans, type PlanItem } from '@/api/plan'
import { saveOrder } from '@/api/order'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'

const plans = ref<PlanItem[]>([])
const loading = ref(false)
const loaded = ref(false)
const msg = useMessage()
const router = useRouter()
const { t } = useI18n()

function priceLabel(p: PlanItem) {
  const prices = [
    p.month_price != null ? `Month ¥${p.month_price / 100}` : null,
    p.quarter_price != null ? `Quarter ¥${p.quarter_price / 100}` : null,
    p.year_price != null ? `Year ¥${p.year_price / 100}` : null,
    p.onetime_price != null ? `Once ¥${p.onetime_price / 100}` : null,
  ].filter(Boolean)
  return prices.join(' · ') || '—'
}

async function buy(planId: number, period = 'month_price') {
  loading.value = true
  try {
    const { trade_no } = await saveOrder({ plan_id: planId, period })
    msg.success(`Order ${trade_no}`)
    router.push('/order')
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    plans.value = await fetchPlans()
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : 'Failed to load plans')
  } finally {
    loaded.value = true
  }
})
</script>

<template>
  <h2 class="page-title">{{ t('nav.plan') }}</h2>
  <n-card v-if="loaded && plans.length === 0">
    <n-empty description="No subscription plans available" />
  </n-card>
  <n-grid v-else :cols="2" :x-gap="12" :y-gap="12">
    <n-gi v-for="p in plans" :key="p.id">
      <n-card :title="p.name">
        <p style="margin:0 0 12px;color:#666;font-size:13px">{{ priceLabel(p) }}</p>
        <n-tag size="small" type="info">{{ (p.transfer_enable / 1073741824).toFixed(0) }} GB</n-tag>
        <div style="margin-top:12px">
          <n-button type="primary" :loading="loading" @click="buy(p.id)">{{ t('common.submit') }}</n-button>
        </div>
      </n-card>
    </n-gi>
  </n-grid>
</template>
