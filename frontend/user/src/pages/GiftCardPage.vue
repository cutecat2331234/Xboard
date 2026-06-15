<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import {
  NButton,
  NCard,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NInput,
  NModal,
  NSpace,
  NTag,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import {
  checkGiftCard,
  fetchGiftCardDetail,
  fetchGiftCardHistory,
  redeemGiftCard,
  type GiftCardCheckResult,
  type GiftCardDetail,
  type GiftCardHistoryItem,
  type GiftCardRewards,
} from '@/api/gift-card'
import { useCurrency } from '@/composables/useCurrency'
import { formatLocaleDateTime } from '@/lib/format-date'
import { useI18n } from '@/i18n'
import { resolveApiError } from '@/lib/api-errors'

const msg = useMessage()
const { t, locale } = useI18n()
const { formatPrice, load: loadCurrency } = useCurrency()

const history = ref<GiftCardHistoryItem[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loadingHistory = ref(false)

const redeemOpen = ref(false)
const redeemCode = ref('')
const checking = ref(false)
const redeeming = ref(false)
const checkResult = ref<GiftCardCheckResult | null>(null)

const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref<GiftCardDetail | null>(null)

function formatPreview(rewards?: GiftCardRewards | { type?: string; pool_size?: number } | null) {
  if (rewards && typeof rewards === 'object' && 'type' in rewards && rewards.type === 'mystery') {
    return t('giftCard.mysteryPreview', { count: rewards.pool_size ?? 0 })
  }
  return formatRewards(rewards as GiftCardRewards | null | undefined)
}

function formatRewards(rewards?: GiftCardRewards | null) {
  if (!rewards) return '—'
  const parts: string[] = []
  if (rewards.balance && rewards.balance > 0) {
    parts.push(`${t('giftCard.rewardBalance')}: ${formatPrice(rewards.balance)}`)
  }
  if (rewards.transfer_enable && rewards.transfer_enable > 0) {
    const gb = rewards.transfer_enable / 1073741824
    parts.push(`${t('giftCard.rewardTraffic')}: ${gb >= 1 ? Math.round(gb) : gb.toFixed(2)} GB`)
  }
  if (rewards.expire_days && rewards.expire_days > 0) {
    parts.push(`${t('giftCard.rewardExpireDays')}: ${rewards.expire_days}`)
  }
  if (rewards.device_limit && rewards.device_limit > 0) {
    parts.push(`${t('giftCard.rewardDeviceLimit')}: ${rewards.device_limit}`)
  }
  if (rewards.reset_package) {
    parts.push(t('giftCard.rewardResetPackage'))
  }
  if (rewards.plan_id) {
    const days = rewards.plan_validity_days ? ` (${rewards.plan_validity_days}${t('giftCard.days')})` : ''
    parts.push(`${t('giftCard.rewardPlan')}: #${rewards.plan_id}${days}`)
  }
  return parts.length ? parts.join(' · ') : '—'
}

function mapGiftCardReason(reason?: string | null): string {
  if (!reason) return ''
  const mapped = resolveApiError(new Error(reason), t)
  return mapped !== reason ? mapped : reason
}

async function loadHistory() {
  loadingHistory.value = true
  try {
    const res = await fetchGiftCardHistory({ page: page.value, per_page: pageSize.value })
    history.value = res.data ?? []
    total.value = res.pagination?.total ?? 0
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
  } finally {
    loadingHistory.value = false
  }
}

function openRedeem() {
  redeemCode.value = ''
  checkResult.value = null
  redeemOpen.value = true
}

async function doCheck() {
  const code = redeemCode.value.trim()
  if (!code) {
    msg.warning(t('giftCard.codeRequired'))
    return
  }
  checking.value = true
  checkResult.value = null
  try {
    checkResult.value = await checkGiftCard(code)
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
  } finally {
    checking.value = false
  }
}

async function doRedeem() {
  const code = redeemCode.value.trim()
  if (!code || !checkResult.value?.can_redeem) return
  redeeming.value = true
  try {
    const res = await redeemGiftCard(code)
    msg.success(t('giftCard.redeemSuccess'))
    redeemOpen.value = false
    redeemCode.value = ''
    checkResult.value = null
    page.value = 1
    await loadHistory()
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
  } finally {
    redeeming.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
  loadHistory()
}

function onPageSizeChange(s: number) {
  pageSize.value = s
  page.value = 1
  loadHistory()
}

async function openDetail(id: number) {
  detailOpen.value = true
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await fetchGiftCardDetail(id)
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
    detailOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

const columns = computed<DataTableColumns<GiftCardHistoryItem>>(() => [
  {
    title: t('giftCard.templateName'),
    key: 'template_name',
    ellipsis: { tooltip: true },
  },
  {
    title: t('giftCard.type'),
    key: 'template_type_name',
    width: 120,
    render: (row) => h(NTag, { round: true, size: 'small' }, () => row.template_type_name || '—'),
  },
  {
    title: t('giftCard.codeMasked'),
    key: 'code',
    width: 140,
  },
  {
    title: t('giftCard.rewards'),
    key: 'rewards_given',
    ellipsis: { tooltip: true },
    render: (row) => formatRewards(row.rewards_given),
  },
  {
    title: t('giftCard.redeemedAt'),
    key: 'created_at',
    width: 170,
    render: (row) => formatLocaleDateTime(row.created_at, locale.value),
  },
  {
    title: t('common.actions'),
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (row) =>
      h(
        'button',
        {
          type: 'button',
          class: 'gift-card-link-btn',
          onClick: () => openDetail(row.id),
        },
        t('giftCard.viewDetail'),
      ),
  },
])

onMounted(async () => {
  await loadCurrency()
  await loadHistory()
})
</script>

<template>
  <n-card :title="t('giftCard.title')" class="rounded-md">
    <template #header-extra>
      <n-button type="primary" size="small" @click="openRedeem">
        {{ t('giftCard.redeem') }}
      </n-button>
    </template>
    <p class="gift-card-hint">{{ t('giftCard.hint') }}</p>
  </n-card>

  <n-card :title="t('giftCard.historyTitle')" class="mt-4 rounded-md">
    <n-empty v-if="!loadingHistory && history.length === 0" :description="t('giftCard.historyEmpty')" />
    <n-data-table
      v-else
      remote
      :columns="columns"
      :data="history"
      :loading="loadingHistory"
      :bordered="true"
      :scroll-x="900"
      :pagination="{
        page,
        pageSize,
        itemCount: total,
        showSizePicker: true,
        pageSizes: [10, 20, 50],
        onUpdatePage: onPageChange,
        onUpdatePageSize: onPageSizeChange,
      }"
    />
  </n-card>

  <n-modal
    v-model:show="redeemOpen"
    preset="card"
    :title="t('giftCard.redeem')"
    style="width: 480px"
    @after-leave="checkResult = null"
  >
    <n-input
      v-model:value="redeemCode"
      :placeholder="t('giftCard.codePh')"
      :disabled="checking || redeeming"
      @keyup.enter="doCheck"
    />
    <n-space class="gift-card-modal-actions" justify="end">
      <n-button :disabled="checking || redeeming" @click="redeemOpen = false">
        {{ t('common.cancel') }}
      </n-button>
      <n-button type="primary" :loading="checking" :disabled="redeeming" @click="doCheck">
        {{ t('giftCard.check') }}
      </n-button>
    </n-space>

    <div v-if="checkResult" class="gift-card-preview">
      <div class="gift-card-preview__name">{{ checkResult.code_info.template.name }}</div>
      <div v-if="checkResult.code_info.template.description" class="gift-card-preview__desc">
        {{ checkResult.code_info.template.description }}
      </div>
      <n-tag size="small" round>{{ checkResult.code_info.template.type_name }}</n-tag>
      <div class="gift-card-preview__rewards">
        <span class="gift-card-preview__label">{{ t('giftCard.rewardPreview') }}</span>
        {{ formatPreview(checkResult.reward_preview) }}
      </div>
      <div v-if="!checkResult.can_redeem && checkResult.reason" class="gift-card-preview__warn">
        {{ mapGiftCardReason(checkResult.reason) }}
      </div>
      <n-space v-if="checkResult.can_redeem" class="gift-card-modal-actions" justify="end">
        <n-button type="primary" :loading="redeeming" @click="doRedeem">
          {{ t('giftCard.confirmRedeem') }}
        </n-button>
      </n-space>
    </div>
  </n-modal>

  <n-modal v-model:show="detailOpen" preset="card" :title="t('giftCard.detailTitle')" style="width: 520px">
    <div v-if="detailLoading" class="gift-card-detail-loading">{{ t('common.loading') }}</div>
    <template v-else-if="detail">
      <n-descriptions :column="1" label-placement="left" bordered size="small">
        <n-descriptions-item :label="t('giftCard.templateName')">
          {{ detail.template.name }}
        </n-descriptions-item>
        <n-descriptions-item v-if="detail.template.description" :label="t('giftCard.description')">
          {{ detail.template.description }}
        </n-descriptions-item>
        <n-descriptions-item :label="t('giftCard.type')">
          {{ detail.template.type_name }}
        </n-descriptions-item>
        <n-descriptions-item :label="t('giftCard.code')">
          {{ detail.code }}
        </n-descriptions-item>
        <n-descriptions-item :label="t('giftCard.rewards')">
          {{ formatRewards(detail.rewards_given) }}
        </n-descriptions-item>
        <n-descriptions-item
          v-if="detail.invite_rewards && Object.keys(detail.invite_rewards).length"
          :label="t('giftCard.inviteRewards')"
        >
          {{ formatRewards(detail.invite_rewards) }}
        </n-descriptions-item>
        <n-descriptions-item v-if="detail.multiplier_applied && detail.multiplier_applied !== 1" :label="t('giftCard.multiplier')">
          ×{{ detail.multiplier_applied }}
        </n-descriptions-item>
        <n-descriptions-item :label="t('giftCard.redeemedAt')">
          {{ formatLocaleDateTime(detail.created_at, locale.value) }}
        </n-descriptions-item>
      </n-descriptions>
    </template>
  </n-modal>
</template>

<style scoped>
.gift-card-hint {
  margin: 0;
  color: #767c82;
  font-size: 14px;
}
.gift-card-modal-actions {
  margin-top: 16px;
}
.gift-card-preview {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #efeff5;
}
.gift-card-preview__name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}
.gift-card-preview__desc {
  color: #767c82;
  font-size: 13px;
  margin-bottom: 8px;
}
.gift-card-preview__rewards {
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.6;
}
.gift-card-preview__label {
  color: #767c82;
  margin-right: 4px;
}
.gift-card-preview__warn {
  margin-top: 12px;
  color: #d03050;
  font-size: 13px;
}
.gift-card-detail-loading {
  padding: 24px;
  text-align: center;
  color: #767c82;
}
:deep(.gift-card-link-btn) {
  border: none;
  background: none;
  color: #316c72;
  cursor: pointer;
  padding: 0;
  font-size: 14px;
}
:deep(.gift-card-link-btn:hover) {
  text-decoration: underline;
}
.mt-4 {
  margin-top: 16px;
}
</style>
