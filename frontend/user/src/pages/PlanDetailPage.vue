<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NCard, NButton, NInput, NRadioGroup, NRadio, NAlert, useMessage, useDialog } from 'naive-ui'
import { fetchPlanById, PERIOD_OPTIONS, type PlanItem } from '@/api/plan'
import { saveOrder, cancelOrder, fetchOrders } from '@/api/order'
import { checkCoupon } from '@/api/coupon'
import { useI18n } from '@/i18n'
import { useCurrency } from '@/composables/useCurrency'

const route = useRoute()
const router = useRouter()
const msg = useMessage()
const dialog = useDialog()
const { t } = useI18n()
const { formatPrice, load: loadCurrency } = useCurrency()

const plan = ref<PlanItem | null>(null)
const period = ref('month_price')
const couponCode = ref('')
const couponDiscount = ref('')
const loading = ref(false)
const buying = ref(false)

const availablePeriods = computed(() =>
  PERIOD_OPTIONS.filter((p) => {
    const price = plan.value?.[p.key as keyof PlanItem]
    return typeof price === 'number' && price > 0
  }),
)

async function load() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    plan.value = await fetchPlanById(id)
    const first = availablePeriods.value[0]
    if (first) period.value = first.key
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : t('common.error'))
    router.push('/plan')
  } finally {
    loading.value = false
  }
}

async function applyCoupon() {
  if (!plan.value || !couponCode.value.trim()) return
  try {
    const info = await checkCoupon({
      code: couponCode.value.trim(),
      plan_id: plan.value.id,
      period: period.value,
    })
    couponDiscount.value =
      info.type === 1 ? `${info.value}%` : formatPrice(info.value)
    msg.success(t('plan.couponApplied'))
  } catch (e: unknown) {
    couponDiscount.value = ''
    msg.error(e instanceof Error ? e.message : t('common.error'))
  }
}

async function ensureNoPendingOrder() {
  const orders = await fetchOrders()
  const pending = orders.find((o) => o.status === 0)
  if (!pending) return true
  return new Promise<boolean>((resolve) => {
    dialog.warning({
      title: t('plan.pendingOrderTitle'),
      content: t('plan.pendingOrderDesc'),
      positiveText: t('plan.cancelPending'),
      negativeText: t('common.cancel'),
      onPositiveClick: async () => {
        await cancelOrder(pending.trade_no)
        resolve(true)
      },
      onNegativeClick: () => resolve(false),
    })
  })
}

async function buy() {
  if (!plan.value) return
  buying.value = true
  try {
    const ok = await ensureNoPendingOrder()
    if (!ok) return
    const tradeNo = await saveOrder({
      plan_id: plan.value.id,
      period: period.value,
      coupon_code: couponCode.value.trim() || undefined,
    })
    router.push(`/order/${String(tradeNo)}`)
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : t('common.error'))
  } finally {
    buying.value = false
  }
}

onMounted(async () => {
  await loadCurrency()
  await load()
})
</script>

<template>
  <n-card v-if="plan" :title="plan.name" class="rounded-md">
    <div v-if="plan.content" class="plan-content" v-html="plan.content" />
    <n-alert v-if="availablePeriods.length === 0" type="warning" :show-icon="true">
      {{ t('plan.noPeriod') }}
    </n-alert>
    <template v-else>
      <div class="section-label">{{ t('plan.selectPeriod') }}</div>
      <n-radio-group v-model:value="period" class="period-group">
        <n-radio
          v-for="p in availablePeriods"
          :key="p.key"
          :value="p.key"
          :label="t(p.labelKey)"
        >
          {{ t(p.labelKey) }} —
          {{ formatPrice((plan[p.key as keyof PlanItem] as number) ?? 0) }}
        </n-radio>
      </n-radio-group>
      <div class="section-label">{{ t('plan.coupon') }}</div>
      <div class="coupon-row">
        <n-input v-model:value="couponCode" :placeholder="t('plan.couponPh')" />
        <n-button @click="applyCoupon">{{ t('plan.applyCoupon') }}</n-button>
      </div>
      <p v-if="couponDiscount" class="coupon-hint">{{ t('plan.couponDiscount') }}: {{ couponDiscount }}</p>
      <n-button type="primary" class="buy-btn" :loading="buying" @click="buy">{{ t('plan.buyNow') }}</n-button>
    </template>
  </n-card>
  <p v-else-if="!loading" class="muted">—</p>
</template>

<style scoped>
.plan-content { margin-bottom: 16px; color: #666; font-size: 14px; }
.section-label { margin: 16px 0 8px; font-weight: 500; }
.period-group { display: flex; flex-direction: column; gap: 8px; }
.coupon-row { display: flex; gap: 8px; max-width: 480px; }
.coupon-row .n-input { flex: 1; }
.coupon-hint { color: #316c72; font-size: 13px; }
.buy-btn { margin-top: 20px; }
.muted { color: #888; }
</style>
