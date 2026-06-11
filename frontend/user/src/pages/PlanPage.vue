<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NCard, NGrid, NGi, NButton, NTag, NEmpty, NSkeleton, useMessage } from 'naive-ui'
import { fetchPlans, PERIOD_OPTIONS, type PlanItem } from '@/api/plan'
import { resolveTryOutPlanId } from '@/api/comm'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { useCurrency } from '@/composables/useCurrency'

const plans = ref<PlanItem[]>([])
const tryOutPlanId = ref(0)
const loaded = ref(false)
const msg = useMessage()
const router = useRouter()
const { t } = useI18n()
const { formatPrice, load: loadCurrency } = useCurrency()

const gridCols = '1 768:2'

function hasPeriodPrices(p: PlanItem) {
  return PERIOD_OPTIONS.some((opt) => {
    const price = p[opt.key as keyof PlanItem]
    return typeof price === 'number' && price > 0
  })
}

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

function transferGb(p: PlanItem) {
  return (p.transfer_enable / 1073741824).toFixed(0)
}

function showCapacity(p: PlanItem) {
  return p.capacity_limit !== undefined && p.capacity_limit !== null
}

function capacityLabel(p: PlanItem) {
  const limit = p.capacity_limit
  if (limit === null || limit === undefined) return ''
  if (typeof limit === 'string') return limit
  return t('plan.capacityRemaining', { count: limit })
}

function capacityTagType(p: PlanItem): 'error' | 'default' {
  return typeof p.capacity_limit === 'string' ? 'error' : 'default'
}

function isTryOutPlan(planId: number) {
  return tryOutPlanId.value > 0 && planId === tryOutPlanId.value
}

function openPlan(planId: number) {
  router.push(`/plan/${planId}`)
}

onMounted(async () => {
  await loadCurrency()
  try {
    const [planList, trialPlanId] = await Promise.all([fetchPlans(), resolveTryOutPlanId()])
    plans.value = planList
    tryOutPlanId.value = trialPlanId
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : t('plan.loadFailed'))
  } finally {
    loaded.value = true
  }
})
</script>

<template>
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
      <n-card>
        <template #header>
          <div class="plan-header">
            <span>{{ p.name }}</span>
            <n-tag v-if="isTryOutPlan(p.id)" size="small" type="info" round>{{ t('plan.tryOutBadge') }}</n-tag>
          </div>
        </template>
        <p v-if="hasPeriodPrices(p)" class="plan-period-hint">{{ t('plan.periodPricesHint') }}</p>
        <p class="plan-price">{{ priceLabel(p) }}</p>
        <div class="plan-tags">
          <n-tag v-if="p.transfer_enable > 0" size="small" type="info">{{ transferGb(p) }} GB</n-tag>
          <n-tag v-if="showCapacity(p)" size="small" :type="capacityTagType(p)">
            {{ capacityLabel(p) }}
          </n-tag>
        </div>
        <div class="plan-actions">
          <n-button type="primary" @click="openPlan(p.id)">{{ t('plan.viewDetail') }}</n-button>
        </div>
      </n-card>
    </n-gi>
  </n-grid>
</template>

<style scoped>
.plan-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.plan-period-hint {
  margin: 0 0 4px;
  color: var(--xb-text-muted);
  font-size: 12px;
}
.plan-price {
  margin: 0 0 12px;
  color: var(--xb-text-muted);
  font-size: 13px;
}
.plan-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.plan-actions {
  margin-top: 12px;
}
</style>
