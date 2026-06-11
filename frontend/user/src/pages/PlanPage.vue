<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NCard, NGrid, NGi, NButton, NTag, NEmpty, NSkeleton, useMessage } from 'naive-ui'
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

const gridCols = '1 768:2'

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
  <n-grid v-if="!loaded" :cols="gridCols" :x-gap="12" :y-gap="12">
    <n-gi v-for="i in 2" :key="i">
      <n-card>
        <n-skeleton text style="height: 20px; width: 60%" />
        <n-skeleton text style="height: 14px; width: 80%; margin-top: 12px" />
        <n-skeleton text style="height: 24px; width: 48px; margin-top: 12px" />
        <n-skeleton text style="height: 34px; width: 100px; margin-top: 12px" />
      </n-card>
    </n-gi>
  </n-grid>
  <n-card v-else-if="plans.length === 0">
    <n-empty :description="t('plan.empty')" />
  </n-card>
  <n-grid v-else :cols="gridCols" :x-gap="12" :y-gap="12">
    <n-gi v-for="p in plans" :key="p.id">
      <n-card :title="p.name">
        <p class="plan-price">{{ priceLabel(p) }}</p>
        <n-tag size="small" type="info">{{ (p.transfer_enable / 1073741824).toFixed(0) }} GB</n-tag>
        <div style="margin-top:12px">
          <n-button type="primary" @click="openPlan(p.id)">{{ t('plan.viewDetail') }}</n-button>
        </div>
      </n-card>
    </n-gi>
  </n-grid>
</template>

<style scoped>
.plan-price {
  margin: 0 0 12px;
  color: var(--xb-text-muted);
  font-size: 13px;
}
</style>
