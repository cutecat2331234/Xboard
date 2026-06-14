<script setup lang="ts">

import { computed, onMounted, onUnmounted, ref } from 'vue'

import { useRoute, useRouter } from 'vue-router'

import { NCard, NButton, NModal, NIcon, NAlert, NTag, NSpin, useMessage, useDialog } from 'naive-ui'

import { CheckmarkCircleOutline } from '@vicons/ionicons5'

import {

  fetchOrderDetail,

  fetchPaymentMethods,

  checkoutOrder,

  checkoutOrderWithMethod,

  checkOrderStatus,

  cancelOrder,

  type OrderDetail,

  type PaymentMethod,

} from '@/api/order'

import { PERIOD_OPTIONS } from '@/api/plan'

import { orderStatusLabel } from '@/lib/order-status'

import { formatFixedDateTime } from '@/lib/format-date'
import { useI18n } from '@/i18n'
import { resolveApiError } from '@/lib/api-errors'

import { useCurrency } from '@/composables/useCurrency'

import QRCode from 'qrcode'

import StripeCardForm from '@/components/StripeCardForm.vue'



type PlanPrices = {

  name?: string

  transfer_enable?: number

  month_price?: number | null

  quarter_price?: number | null

  half_year_price?: number | null

  year_price?: number | null

  two_year_price?: number | null

  three_year_price?: number | null

  onetime_price?: number | null

  reset_price?: number | null

}



const route = useRoute()

const router = useRouter()

const msg = useMessage()

const dialog = useDialog()

const { t, locale } = useI18n()

const { symbol, code, formatPrice, load: loadCurrency } = useCurrency()



const order = ref<

  (OrderDetail & {

    discount_amount?: number

    surplus_amount?: number

    surplus_credit?: number

    plan?: PlanPrices

  }) | null

>(null)

const methods = ref<PaymentMethod[]>([])

const selectedMethod = ref<number | null>(null)

const selectedMethodIndex = ref(0)

const paying = ref(false)
const pageLoading = ref(true)

const qrOpen = ref(false)

const qrDataUrl = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null



const selectedPayment = computed(() => methods.value.find((m) => m.id === selectedMethod.value))

const isStripe = computed(() => selectedPayment.value?.payment === 'StripeCredit')

const stripeFormRef = ref<InstanceType<typeof StripeCardForm> | null>(null)



const periodLabel = computed(() => {

  const p = order.value?.period

  if (!p) return ''

  const hit = PERIOD_OPTIONS.find((o) => o.key === p)

  return hit ? t(hit.labelKey) : p

})



const periodPlanPrice = computed(() => {

  const o = order.value

  if (!o?.plan || !o.period) return null

  const raw = o.plan[o.period as keyof PlanPrices]

  return typeof raw === 'number' ? raw : null

})



const handlingPreview = computed(() => {

  const m = selectedPayment.value

  const base = periodPlanPrice.value ?? order.value?.total_amount ?? 0

  if (!m) return 0

  return Math.round((base * (m.handling_fee_percent ?? 0)) / 100) + (m.handling_fee_fixed ?? 0)

})



const isPending = computed(() => Number(order.value?.status) === 0)



/** Paid orders store handling on the order; pending uses live payment-method preview. */
const orderHandlingDisplay = computed(() => {

  const o = order.value

  if (!o) return 0

  if (!isPending.value) return o.handling_amount ?? 0

  return handlingPreview.value

})



const checkoutBase = computed(() => periodPlanPrice.value ?? order.value?.total_amount ?? 0)



const payTotal = computed(() => {

  const base = checkoutBase.value

  const surplus = order.value?.surplus_amount ?? 0

  const discount = order.value?.discount_amount ?? 0

  const refund = order.value?.surplus_credit ?? 0

  const balance = order.value?.balance_amount ?? 0

  const handling = order.value?.handling_amount ?? handlingPreview.value

  return Math.max(0, base - surplus - discount - refund - balance + (handling || 0))

})



const isTryOutPlan = computed(() => {

  const o = order.value

  if (!o?.try_out_plan_id) return false

  return o.plan_id === o.try_out_plan_id

})



async function load() {

  const tradeNo = String(route.params.trade_no)
  pageLoading.value = true

  try {

    order.value = await fetchOrderDetail(tradeNo)

    if (order.value.status === 0) {

      methods.value = await fetchPaymentMethods()

      if (methods.value.length) {

        selectedMethod.value = methods.value[0].id

        selectedMethodIndex.value = 0

      }

    }

  } catch (e: unknown) {

    msg.error(resolveApiError(e, t))

    router.push('/order')

  } finally {
    pageLoading.value = false
  }

}



function selectMethod(index: number) {

  selectedMethodIndex.value = index

  selectedMethod.value = methods.value[index]?.id ?? null

}



function startPoll(tradeNo: string) {

  stopPoll()

  pollTimer = setInterval(async () => {

    try {

      const status = await checkOrderStatus(tradeNo)

      if (status !== 0) {

        stopPoll()

        qrOpen.value = false

        msg.success(t('order.paySuccess'))

        await load()

      }

    } catch {

      /* ignore */

    }

  }, 3000)

}



function stopPoll() {

  if (pollTimer) {

    clearInterval(pollTimer)

    pollTimer = null

  }

}



async function handleCheckoutResult(res: { type: number; data: string | boolean }) {

  if (!order.value) return

  if (res.type === -1) {

    msg.success(t('order.paySuccess'))

    load()

    return

  }

  if (res.type === 0 && typeof res.data === 'string') {

    qrDataUrl.value = await QRCode.toDataURL(res.data, { width: 220, margin: 1 })

    qrOpen.value = true

    startPoll(order.value.trade_no)

    return

  }

  if (res.type === 1 && typeof res.data === 'string') {

    window.open(res.data, '_blank')

    startPoll(order.value.trade_no)

    return

  }

  msg.info(String(res.data))

  startPoll(order.value.trade_no)

}



async function pay() {

  if (!order.value) return

  if (payTotal.value <= 0) {

    paying.value = true

    try {

      const res = await checkoutOrder(order.value.trade_no)

      await handleCheckoutResult(res)

    } catch (e: unknown) {

      msg.error(resolveApiError(e, t))

    } finally {

      paying.value = false

    }

    return

  }

  if (selectedMethod.value == null) {

    msg.warning(t('order.selectPayment'))

    return

  }

  paying.value = true

  try {

    let token: string | undefined

    if (isStripe.value) {

      token = await stripeFormRef.value?.createToken()

      if (!token) {

        msg.error(t('order.stripeRequired'))

        return

      }

    }

    const res = await checkoutOrderWithMethod(order.value.trade_no, selectedMethod.value, token)

    await handleCheckoutResult(res)

  } catch (e: unknown) {

    msg.error(resolveApiError(e, t))

  } finally {

    paying.value = false

  }

}



function confirmClose() {

  dialog.warning({

    title: t('order.notice'),

    content: t('order.closeConfirm'),

    positiveText: t('common.confirm'),

    negativeText: t('common.cancel'),

    onPositiveClick: async () => {

      if (!order.value) return

      await cancelOrder(order.value.trade_no)

      msg.success(t('order.closeSuccess'))

      await load()

    },

  })

}



onMounted(async () => {

  await loadCurrency()

  await load()

})

onUnmounted(stopPoll)

</script>



<template>

  <n-spin :show="pageLoading">
  <div v-if="order" class="order-detail-page">

    <div class="order-detail-main">

      <n-card class="mt-5 rounded-md" :title="t('order.productInfo')">

        <n-alert v-if="isTryOutPlan" class="try-out-alert" type="info" :show-icon="true">

          {{ t('order.tryOutHint') }}

        </n-alert>

        <div class="info-row">

          <div class="info-label">{{ t('order.productName') }}：</div>

          <div class="info-value try-out-name">

            <span>{{ order.plan?.name }}</span>

            <n-tag v-if="isTryOutPlan" size="small" type="info" round class="try-out-tag">

              {{ t('order.tryOutBadge') }}

            </n-tag>

          </div>

        </div>

        <div class="info-row">

          <div class="info-label">{{ t('order.typePeriod') }}：</div>

          <div class="info-value">{{ periodLabel }}</div>

        </div>

        <div class="info-row">

          <div class="info-label">{{ t('order.productTraffic') }}：</div>

          <div class="info-value">{{ order.plan?.transfer_enable ?? 0 }} GB</div>

        </div>

      </n-card>



      <n-card class="order-info-card mt-5 rounded-md" :title="t('order.orderInfo')">

        <template v-if="isPending" #header-extra>

          <n-button color="#db4619" size="small" round strong @click="confirmClose">

            {{ t('order.closeOrder') }}

          </n-button>

        </template>

        <div class="info-row">

          <div class="info-label">{{ t('order.tradeNo') }}：</div>

          <div class="info-value">{{ order.trade_no }}</div>

        </div>

        <template v-if="isPending">

          <div v-if="orderHandlingDisplay > 0" class="info-row">

            <div class="info-label">{{ t('order.handlingFee') }}：</div>

            <div class="info-value">{{ formatPrice(orderHandlingDisplay) }}</div>

          </div>

        </template>

        <template v-else>

          <div v-if="order.discount_amount && order.discount_amount > 0" class="info-row">

            <div class="info-label">{{ t('order.discount') }}</div>

            <div class="info-value">{{ formatPrice(order.discount_amount) }}</div>

          </div>

          <div v-if="order.surplus_amount && order.surplus_amount > 0" class="info-row">

            <div class="info-label">{{ t('order.surplusLegacy') }}</div>

            <div class="info-value">{{ formatPrice(order.surplus_amount) }}</div>

          </div>

          <div v-if="order.surplus_credit && order.surplus_credit > 0" class="info-row">

            <div class="info-label">{{ t('order.refundAmount') }}</div>

            <div class="info-value">{{ formatPrice(order.surplus_credit) }}</div>

          </div>

          <div v-if="order.balance_amount && order.balance_amount > 0" class="info-row">

            <div class="info-label">{{ t('order.balancePay') }}</div>

            <div class="info-value">{{ formatPrice(order.balance_amount) }}</div>

          </div>

          <div class="info-row">

            <div class="info-label">{{ t('order.amount') }}</div>

            <div class="info-value">{{ formatPrice(order.total_amount) }}</div>

          </div>

          <div class="info-row">

            <div class="info-label">{{ t('order.status') }}</div>

            <div class="info-value">{{ t(orderStatusLabel(order.status)) }}</div>

          </div>

        </template>

        <div class="info-row">

          <div class="info-label">{{ t('order.createdAt') }}：</div>

          <div class="info-value">{{ formatFixedDateTime(order.created_at) }}</div>

        </div>

      </n-card>



      <n-card

        v-if="isPending"

        class="mt-5 rounded-md pay-card"

        :title="t('order.paymentMethod')"

        :content-style="{ padding: 0 }"

      >

        <div

          v-for="(m, index) in methods"

          :key="m.id"

          class="border-2 rounded-md p-5 border-solid flex pay-option"

          :class="selectedMethodIndex === index ? 'border-primary' : 'border-transparent'"

          @click="selectMethod(index)"

        >

          <div class="pay-option__name">{{ m.name }}</div>

          <div class="pay-option__icon">

            <img v-if="m.icon" class="max-h-8" :src="m.icon" alt="" />

          </div>

        </div>

        <StripeCardForm v-if="isStripe" ref="stripeFormRef" :payment-id="selectedMethod" class="pay-stripe" />

      </n-card>

    </div>



    <div v-if="isPending" class="order-detail-aside">

      <div class="summary-panel mt-5 rounded-md">

        <div class="summary-panel__title">{{ t('order.totalTitle') }}</div>

        <div class="summary-panel__plan">

          <div class="summary-panel__plan-name">{{ order.plan?.name }}</div>

          <div v-if="periodPlanPrice != null" class="summary-panel__plan-price">

            {{ symbol }}{{ (periodPlanPrice / 100).toFixed(2) }}

          </div>

        </div>

        <div v-if="order.surplus_amount && order.surplus_amount > 0" class="summary-panel__row">

          <span class="summary-panel__muted">{{ t('order.surplus') }}</span>

          <span class="summary-panel__amount">-{{ symbol }}{{ (order.surplus_amount / 100).toFixed(2) }}</span>

        </div>

        <div v-if="order.discount_amount && order.discount_amount > 0" class="summary-panel__row">

          <span class="summary-panel__muted">{{ t('order.discountLabel') }}</span>

          <span class="summary-panel__amount">-{{ symbol }}{{ (order.discount_amount / 100).toFixed(2) }}</span>

        </div>

        <div v-if="order.surplus_credit && order.surplus_credit > 0" class="summary-panel__row">

          <span class="summary-panel__muted">{{ t('order.refund') }}</span>

          <span class="summary-panel__amount">-{{ symbol }}{{ (order.surplus_credit / 100).toFixed(2) }}</span>

        </div>

        <div v-if="order.balance_amount && order.balance_amount > 0" class="summary-panel__row">

          <span class="summary-panel__muted">{{ t('order.balancePay') }}</span>

          <span class="summary-panel__amount">-{{ symbol }}{{ (order.balance_amount / 100).toFixed(2) }}</span>

        </div>

        <div v-if="handlingPreview > 0" class="summary-panel__row">

          <span class="summary-panel__muted">{{ t('order.handlingFee') }}</span>

          <span class="summary-panel__amount">+{{ symbol }}{{ (handlingPreview / 100).toFixed(2) }}</span>

        </div>

        <div class="summary-panel__total">

          <div class="summary-panel__muted">{{ t('order.grandTotal') }}</div>

          <div class="summary-panel__grand">{{ symbol }} {{ (payTotal / 100).toFixed(2) }} {{ code }}</div>

        </div>

        <n-button

          type="primary"

          class="checkout-btn w-full text-white"

          strong

          :loading="paying"

          icon-placement="left"

          @click="pay"

        >

          <template #icon>

            <n-icon><CheckmarkCircleOutline /></n-icon>

          </template>

          {{ t('order.checkout') }}

        </n-button>

      </div>

    </div>

  </div>



  <n-modal v-model:show="qrOpen" preset="card" :title="t('order.scanPay')" style="width: 360px">

    <div class="qr-wrap">

      <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" width="220" height="220" class="pay-qrcode" />

      <p class="qr-hint">{{ t('order.scanHint') }}</p>

    </div>

  </n-modal>

  </n-spin>

</template>



<style scoped>

.order-detail-page {
  margin-top: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.order-detail-main {
  width: 100%;
  flex: none;
  min-width: 0;
}

/* Card padding follows shell-main global.css (19/24/20 header, 0/24/20 content) like 7001 */
.order-detail-page :deep(.n-card-header),
.order-detail-page :deep(.n-card__header) {
  font-weight: 400;
}

.order-detail-main > .n-card:first-child :deep(.n-card__content),
.order-detail-main > .n-card:first-child :deep(.n-card-content) {
  padding-bottom: 21px;
}

.order-detail-page .order-info-card :deep(.n-card__content),
.order-detail-page .order-info-card :deep(.n-card-content) {
  padding-bottom: 17px;
}

.order-detail-aside {
  width: 100%;
  flex: none;
  min-width: 0;
  padding-left: 0;
}

@media (min-width: 768px) {
  .order-detail-page {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .order-detail-main {
    flex: 2 2 0%;
  }

  .order-detail-aside {
    flex: 1 1 0%;
    padding-left: 20px;
  }
}

.info-row {

  display: flex;

  padding: var(--xb-info-row-padding);

  line-height: var(--xb-info-row-lh);

}

.info-label {

  flex: 1;

  color: var(--xb-text-secondary);

  font-size: 14px;

  line-height: var(--xb-info-row-lh);

}

.info-value {

  flex: 2;

  color: var(--xb-text);

  font-size: 14px;

  line-height: var(--xb-info-row-lh);

  word-break: break-all;

}

.try-out-alert {

  margin-bottom: 12px;

}

.try-out-name {

  display: flex;

  align-items: center;

  gap: 8px;

  flex-wrap: wrap;

}

.try-out-tag {

  flex-shrink: 0;

}

.pay-option {

  cursor: pointer;

}

.pay-option__name {

  flex: 1;

  white-space: nowrap;

  font-size: 14px;

}

.pay-option__icon {

  flex: 1;

  text-align: right;

}

.max-h-8 {

  max-height: 32px;

}

.pay-stripe {

  padding: 0 24px 20px;

}

.summary-panel {
  background: var(--xb-order-summary-bg);
  color: var(--xb-order-summary-fg);
  padding: 20px;
  border-radius: 6px;
  font-size: 14px;
}

.summary-panel__title {
  font-size: 18px;
  line-height: 28px;
  font-weight: 500;
}

.summary-panel__plan {

  display: flex;

  border-bottom: 1px solid var(--xb-order-summary-plan-border);

  padding-top: 16px;

  padding-bottom: 16px;

  font-size: 14px;

}

.summary-panel__plan-name {

  flex: 2;

}

.summary-panel__plan-price {

  flex: 1;

  text-align: right;

  color: var(--xb-order-summary-plan-price);

}

.summary-panel__row {

  display: flex;

  justify-content: space-between;

  border-bottom: 1px solid var(--xb-order-summary-row-border);

  padding-top: 16px;

  padding-bottom: 16px;

  font-size: 14px;

}

.summary-panel__muted {

  color: var(--xb-order-summary-muted);

}

.summary-panel__amount {

  text-align: right;

}

.summary-panel__total {

  padding-top: 16px;

  padding-bottom: 16px;

}

.summary-panel__grand {

  font-size: var(--xb-order-summary-grand-size);

  line-height: var(--xb-order-summary-grand-lh);

  font-weight: 600;

  margin-top: 5px;

}

.w-full {

  width: 100%;

}

.text-white :deep(.n-button__content) {

  color: #fff;

}

.qr-wrap {

  text-align: center;

}

.qr-hint {

  color: var(--xb-text-muted);

  font-size: 13px;

  margin-top: 12px;

}

</style>

