<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NCard, NGrid, NGi, NButton, NTag, NEmpty, useMessage } from 'naive-ui'
import { fetchPlans, PERIOD_OPTIONS, type PlanItem } from '@/api/plan'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { useCurrency } from '@/composables/useCurrency'

const plans = ref<PlanItem[]>([])
const loaded = ref(false)
const msg = useMessage()
const router = useRouter()
const { t } = useI18n()
const { formatPrice, load: loadCurrency } = useCurrency()

function priceLabel(p: PlanItem) {
  const parts = PERIOD_OPTIONS.map((opt) => {
    const price = p[opt.key as keyof PlanItem]
    if (typeof price === 'number' && price > 0) {
      return `${t(opt.labelKey)} ${formatPrice(price)}`
    }
    return null
  }).filter(Boolean)
  return parts.join(' · ') || '—'
}

function openPlan(planId: number) {
  router.push(`/plan/${planId}`)
}

onMounted(async () => {
  await loadCurrency()
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
    <n-empty :description="t('plan.empty')" />
  </n-card>
  <n-grid v-else :cols="2" :x-gap="12" :y-gap="12">
    <n-gi v-for="p in plans" :key="p.id">
      <n-card :title="p.name">
        <p style="margin:0 0 12px;color:#666;font-size:13px">{{ priceLabel(p) }}</p>
        <n-tag size="small" type="info">{{ (p.transfer_enable / 1073741824).toFixed(0) }} GB</n-tag>
        <div style="margin-top:12px">
          <n-button type="primary" @click="openPlan(p.id)">{{ t('plan.viewDetail') }}</n-button>
        </div>
      </n-card>
    </n-gi>
  </n-grid>
</template>
