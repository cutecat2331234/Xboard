<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NCard, NButton, NInput, NRadioGroup, NRadio, NAlert, NTag, NSpin, useMessage, useDialog } from 'naive-ui'
import { fetchPlanById, PERIOD_OPTIONS, type PlanItem } from '@/api/plan'
import { saveOrder, cancelOrder, fetchOrders } from '@/api/order'
import { resolveTryOutPlanId } from '@/api/comm'
import { useUserCommConfig } from '@/composables/useUserCommConfig'
import { checkCoupon } from '@/api/coupon'
import { useI18n } from '@/i18n'
import { useCurrency } from '@/composables/useCurrency'
import { useAuthStore } from '@/stores/auth'
import { resolveApiError } from '@/lib/api-errors'
import { featureEnabled } from '@/lib/feature-flags'
import DOMPurify from 'dompurify'

const route = useRoute()
const router = useRouter()
const msg = useMessage()
const dialog = useDialog()
const { t } = useI18n()
const { formatPrice, load: loadCurrency } = useCurrency()
const auth = useAuthStore()
const { config: commConfig, load: loadComm } = useUserCommConfig()

const plan = ref<PlanItem | null>(null)
const tryOutPlanId = ref(0)
const period = ref('month_price')
const couponCode = ref('')
const couponDiscount = ref('')
const loading = ref(false)
const buying = ref(false)
const commReady = ref(false)

const availablePeriods = computed(() =>
  PERIOD_OPTIONS.filter((p) => {
    const price = plan.value?.[p.key as keyof PlanItem]
    if (typeof price !== 'number' || price <= 0) return false
    if (p.key === 'reset_price' && !canBuyResetTraffic.value) return false
    return true
  }),
)

const canBuyResetTraffic = computed(() => {
  const user = auth.user
  const p = plan.value
  if (!user || !p) return false
  const now = Math.floor(Date.now() / 1000)
  const hasActiveSub = user.expired_at === null || user.expired_at > now
  return hasActiveSub && user.plan_id === p.id
})

const isTryOutPlan = computed(
  () => tryOutPlanId.value > 0 && plan.value?.id === tryOutPlanId.value,
)

const sanitizedPlanContent = computed(() =>
  plan.value?.content ? DOMPurify.sanitize(plan.value.content) : '',
)

const showPlanChangeBlockedAlert = computed(() => isPlanChangeBlocked())

function isSoldOut(): boolean {
  const limit = plan.value?.capacity_limit
  if (limit === null || limit === undefined) return false
  if (typeof limit === 'string') return /sold\s*out|售罄/i.test(limit)
  return limit <= 0
}

function isPlanChangeBlocked(): boolean {
  if (!commReady.value || commConfig.value == null) return false
  if (commConfig.value.plan_change_enable !== 0) return false
  const user = auth.user
  const p = plan.value
  if (!user || !p) return false
  const now = Math.floor(Date.now() / 1000)
  const hasActiveSub = user.expired_at === null || user.expired_at > now
  if (!hasActiveSub || !user.plan_id) return false
  return user.plan_id !== p.id
}

async function load() {
  loading.value = true
  try {
    const id = Number(route.params.id)
    plan.value = await fetchPlanById(id)
    const first = availablePeriods.value[0]
    if (first) period.value = first.key
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
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
      info.type === 2 ? `${info.value}%` : formatPrice(info.value)
    msg.success(t('plan.couponApplied'))
  } catch (e: unknown) {
    couponDiscount.value = ''
    msg.error(resolveApiError(e, t))
  }
}

watch(period, () => {
  couponDiscount.value = ''
  couponCode.value = ''
})

async function ensureNoPendingOrder() {
  const orders = await fetchOrders()
  const blocking = orders.find((o) => o.status === 0 || o.status === 1)
  if (!blocking) return true
  if (blocking.status === 1) {
    msg.warning(t('plan.processingOrderDesc'))
    return false
  }
  return new Promise<boolean>((resolve) => {
    dialog.warning({
      title: t('plan.pendingOrderTitle'),
      content: t('plan.pendingOrderDesc'),
      positiveText: t('plan.cancelPending'),
      negativeText: t('common.cancel'),
      onPositiveClick: async () => {
        try {
          await cancelOrder(blocking.trade_no)
          resolve(true)
        } catch (e: unknown) {
          msg.error(resolveApiError(e, t))
          resolve(false)
        }
      },
      onNegativeClick: () => resolve(false),
    })
  })
}

async function buy() {
  if (!plan.value) return
  if (isSoldOut()) {
    msg.warning(t('errors.planSoldOut'))
    return
  }
  if (!commReady.value || commConfig.value == null) {
    msg.warning(t('errors.commConfigFailed'))
    return
  }
  if (isPlanChangeBlocked()) {
    msg.warning(t('errors.planChangeDisabled'))
    return
  }
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
    msg.error(resolveApiError(e, t))
  } finally {
    buying.value = false
  }
}

onMounted(async () => {
  await loadCurrency()
  await auth.loadUser()
  try {
    await loadComm()
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t, t('errors.requestFailed')))
  } finally {
    commReady.value = true
  }
  await Promise.all([load(), resolveTryOutPlanId().then((id) => { tryOutPlanId.value = id })])
})
</script>

<template>
  <div class="plan-detail-page">
  <n-spin v-if="loading" class="plan-loading" />
  <n-card v-else-if="plan" class="plan-detail-card rounded-md">
    <template #header>
      <div class="plan-header">
        <span>{{ plan.name }}</span>
        <n-tag v-if="isTryOutPlan" size="small" type="info" round>{{ t('plan.tryOutBadge') }}</n-tag>
      </div>
    </template>
    <n-alert v-if="isSoldOut()" type="warning" :show-icon="true" class="try-out-alert">
      {{ t('errors.planSoldOut') }}
    </n-alert>
    <n-alert v-if="isTryOutPlan" type="info" :show-icon="true" class="try-out-alert">
      {{ t('plan.tryOutHint') }}
    </n-alert>
    <n-alert v-if="showPlanChangeBlockedAlert" type="warning" :show-icon="true" class="try-out-alert">
      {{ t('errors.planChangeDisabled') }}
    </n-alert>
    <div v-if="plan.content" class="plan-content" v-html="sanitizedPlanContent" />
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
      <div v-if="featureEnabled(commConfig?.coupon_enable, commConfig != null)" class="section-label">{{ t('plan.coupon') }}</div>
      <div v-if="featureEnabled(commConfig?.coupon_enable, commConfig != null)" class="coupon-row">
        <n-input v-model:value="couponCode" :placeholder="t('plan.couponPh')" />
        <n-button @click="applyCoupon">{{ t('plan.applyCoupon') }}</n-button>
      </div>
      <p v-if="featureEnabled(commConfig?.coupon_enable, commConfig != null) && couponDiscount" class="coupon-hint">{{ t('plan.couponDiscount') }}: {{ couponDiscount }}</p>
      <n-button type="primary" class="buy-btn" :loading="buying" :disabled="!commReady || isSoldOut()" @click="buy">{{ t('plan.buyNow') }}</n-button>
    </template>
  </n-card>
  <p v-else class="muted">—</p>
  </div>
</template>

<style scoped>
.plan-loading {
  display: block;
  padding: 48px 0;
}
.plan-detail-page {
  max-width: 800px;
}
.plan-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.try-out-alert {
  margin-bottom: 16px;
}
.plan-content { margin-bottom: 16px; color: #666; font-size: 14px; }
.section-label { margin: 16px 0 8px; font-weight: 500; }
.period-group {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.coupon-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 480px;
}
.coupon-row .n-input {
  flex: 1 1 160px;
  min-width: 0;
}
.coupon-row .n-button {
  flex: 0 0 auto;
}
.coupon-hint { color: #316c72; font-size: 13px; }
.buy-btn { margin-top: 20px; }
.muted { color: #888; }

@media (min-width: 768px) {
  .period-group {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .plan-detail-page :deep(.plan-detail-card .n-card-header),
  .plan-detail-page :deep(.plan-detail-card .n-card__header) {
    padding: 12px 12px 14px;
  }
  .plan-detail-page :deep(.plan-detail-card .n-card__content),
  .plan-detail-page :deep(.plan-detail-card .n-card-content) {
    padding: 0 12px 16px;
  }
  .coupon-row {
    max-width: none;
  }
  .coupon-row .n-input,
  .coupon-row .n-button {
    flex: 1 1 100%;
  }
  .buy-btn {
    width: 100%;
  }
}
</style>
