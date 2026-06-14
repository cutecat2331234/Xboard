<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NDataTable,
  NIcon,
  NModal,
  NInput,
  NNumberAnimation,
  NPagination,
  NSelect,
  NSpace,
  NSpin,
  useMessage,
  type DataTableColumns,
  type PaginationInfo,
} from 'naive-ui'
import {
  fetchInvite,
  fetchInviteDetails,
  generateInviteCode,
  transferCommission,
  withdrawCommission,
  type InviteCode,
} from '@/api/invite'
import { useUserCommConfig } from '@/composables/useUserCommConfig'
import { useGuestConfig } from '@/composables/useGuestConfig'
import { useCurrency } from '@/composables/useCurrency'
import { formatFixedDateTime } from '@/lib/format-date'
import { useI18n } from '@/i18n'
import { resolveApiError } from '@/lib/api-errors'
import { featureEnabled } from '@/lib/feature-flags'

const INVITE_PAGE_SIZE = 10

const TransferIcon = {
  render() {
    return h('svg', { class: 'inline-block', viewBox: '0 0 1024 1024', width: '1em', height: '1em' }, [
      h('path', {
        fill: 'currentColor',
        d: 'M668.6 320c0-4.4-3.6-8-8-8h-54.5c-3 0-5.8 1.7-7.1 4.4l-84.7 168.8H511l-84.7-168.8a8 8 0 0 0-7.1-4.4h-55.7c-1.3 0-2.6.3-3.8 1c-3.9 2.1-5.3 7-3.2 10.8l103.9 191.6h-57c-4.4 0-8 3.6-8 8v27.1c0 4.4 3.6 8 8 8h76v39h-76c-4.4 0-8 3.6-8 8v27.1c0 4.4 3.6 8 8 8h76V704c0 4.4 3.6 8 8 8h49.9c4.4 0 8-3.6 8-8v-63.5h76.3c4.4 0 8-3.6 8-8v-27.1c0-4.4-3.6-8-8-8h-76.3v-39h76.3c4.4 0 8-3.6 8-8v-27.1c0-4.4-3.6-8-8-8H564l103.7-191.6c.5-1.1.9-2.4.9-3.7M157.9 504.2a352.7 352.7 0 0 1 103.5-242.4c32.5-32.5 70.3-58.1 112.4-75.9c43.6-18.4 89.9-27.8 137.6-27.8c47.8 0 94.1 9.3 137.6 27.8c42.1 17.8 79.9 43.4 112.4 75.9c10 10 19.3 20.5 27.9 31.4l-50 39.1a8 8 0 0 0 3 14.1l156.8 38.3c5 1.2 9.9-2.6 9.9-7.7l.8-161.5c0-6.7-7.7-10.5-12.9-6.3l-47.8 37.4C770.7 146.3 648.6 82 511.5 82C277 82 86.3 270.1 82 503.8a8 8 0 0 0 8 8.2h60c4.3 0 7.8-3.5 7.9-7.8M934 512h-60c-4.3 0-7.9 3.5-8 7.8a352.7 352.7 0 0 1-103.5 242.4a352.6 352.6 0 0 1-112.4 75.9c-43.6 18.4-89.9 27.8-137.6 27.8s-94.1-9.3-137.6-27.8a352.6 352.6 0 0 1-112.4-75.9c-10-10-19.3-20.5-27.9-31.4l49.9-39.1a8 8 0 0 0-3-14.1l-156.8-38.3c-5-1.2-9.9 2.6-9.9 7.7l-.8 161.7c0 6.7 7.7 10.5 12.9 6.3l47.8-37.4C253.3 877.7 375.4 942 512.5 942C747 942 937.7 753.9 942 520.2a8 8 0 0 0-8-8.2',
      }),
    ])
  },
}

const WithdrawIcon = {
  render() {
    return h('svg', { class: 'inline-block', viewBox: '0 0 1024 1024', width: '1em', height: '1em' }, [
      h('path', {
        fill: 'currentColor',
        d: 'M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448s448-200.6 448-448S759.4 64 512 64m0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372s372 166.6 372 372s-166.6 372-372 372m159.6-585h-59.5c-3 0-5.8 1.7-7.1 4.4l-90.6 180H511l-90.6-180a8 8 0 0 0-7.1-4.4h-60.7c-1.3 0-2.6.3-3.8 1c-3.9 2.1-5.3 7-3.2 10.9L457 515.7h-61.4c-4.4 0-8 3.6-8 8v29.9c0 4.4 3.6 8 8 8h81.7V603h-81.7c-4.4 0-8 3.6-8 8v29.9c0 4.4 3.6 8 8 8h81.7V717c0 4.4 3.6 8 8 8h54.3c4.4 0 8-3.6 8-8v-68.1h82c4.4 0 8-3.6 8-8V611c0-4.4-3.6-8-8-8h-82v-41.5h82c4.4 0 8-3.6 8-8v-29.9c0-4.4-3.6-8-8-8h-62l111.1-204.8c.6-1.2 1-2.5 1-3.8c-.1-4.4-3.7-8-8.1-8',
      }),
    ])
  },
}

const codes = ref<InviteCode[]>([])
const stat = ref<number[]>([0, 0, 0, 0, 0])
const details = ref<Array<{ created_at?: number; get_amount?: number }>>([])
const detailsTotal = ref(0)
const codesPage = ref(1)
const detailsPage = ref(1)
const detailsPageSize = ref(INVITE_PAGE_SIZE)
const msg = useMessage()
const router = useRouter()
const { t } = useI18n()
const { formatAmount, formatPriceSpaced, load: loadCurrency, code: currencyCode } = useCurrency()
const transferOpen = ref(false)
const withdrawOpen = ref(false)
const transferAmount = ref('')
const { config: commConfig, load: loadComm } = useUserCommConfig()
const { config: guestConfig, load: loadGuest } = useGuestConfig()
const withdrawMethod = ref('')
const withdrawAccount = ref('')
const pageLoading = ref(true)

const available = computed(() => (stat.value[4] ?? 0) / 100)
const showCommissionFinance = computed(() => !commConfig.value?.withdraw_close)

const showCodesPagination = computed(() => codes.value.length > INVITE_PAGE_SIZE)

const paginatedCodes = computed(() => {
  if (!showCodesPagination.value) return codes.value
  const start = (codesPage.value - 1) * INVITE_PAGE_SIZE
  return codes.value.slice(start, start + INVITE_PAGE_SIZE)
})

const detailTablePagination = computed(() => ({
  page: detailsPage.value,
  pageSize: detailsPageSize.value,
  itemCount: detailsTotal.value,
  showSizePicker: true,
  pageSizes: [10, 50, 100, 150],
  onUpdatePage: (page: number) => {
    detailsPage.value = page
  },
  onUpdatePageSize: (size: number) => {
    detailsPageSize.value = size
    detailsPage.value = 1
  },
}))

function paginationPrefix(info: PaginationInfo) {
  const pageCount = Math.max(1, Math.ceil(info.itemCount / info.pageSize))
  return t('common.pagination.summary', {
    current: info.page,
    total: pageCount,
    count: info.itemCount,
  })
}

watch(
  () => codes.value.length,
  () => {
    const maxPage = Math.max(1, Math.ceil(codes.value.length / INVITE_PAGE_SIZE))
    if (codesPage.value > maxPage) codesPage.value = maxPage
  },
)

watch([detailsPage, detailsPageSize], () => {
  void loadDetails()
})

const commissionRateLabel = computed(() => {
  const base = stat.value[3] ?? 0
  const cfg = commConfig.value
  if (cfg?.commission_distribution_enable) {
    const l1 = Math.floor((Number(cfg.commission_distribution_l1) || 0) * base / 100)
    const l2 = Math.floor((Number(cfg.commission_distribution_l2) || 0) * base / 100)
    const l3 = Math.floor((Number(cfg.commission_distribution_l3) || 0) * base / 100)
    return `${l1}%,${l2}%,${l3}%`
  }
  return `${base}%`
})

const withdrawLimitLabel = computed(() => {
  const limit = Number(commConfig.value?.commission_withdraw_limit ?? 0)
  if (!Number.isFinite(limit) || limit <= 0) return ''
  return t('invite.withdrawLimitHint', { limit: formatPriceSpaced(limit * 100) })
})

const withdrawFeeLabel = computed(() => {
  const rate = Number(commConfig.value?.withdraw_fee_rate ?? 0)
  if (!Number.isFinite(rate) || rate <= 0) return ''
  const percent = rate * 100
  const display = Number.isInteger(percent) ? String(percent) : percent.toFixed(2).replace(/\.?0+$/, '')
  return t('invite.withdrawFeeHint', { rate: display })
})

function inviteLink(code: string) {
  const appUrl = guestConfig.value?.app_url?.trim().replace(/\/+$/, '')
  const base = appUrl || `${window.location.protocol}//${window.location.host}`
  return `${base}/#/register?code=${code}`
}

async function loadDetails() {
  try {
    const res = await fetchInviteDetails(detailsPage.value, detailsPageSize.value)
    details.value = res.data ?? []
    detailsTotal.value = res.total ?? 0
  } catch (e: unknown) {
    details.value = []
    detailsTotal.value = 0
    msg.error(resolveApiError(e, t))
  }
}

async function load() {
  pageLoading.value = true
  try {
    const data = await fetchInvite()
    codes.value = data.codes ?? []
    stat.value = data.stat ?? [0, 0, 0, 0, 0]
    await loadDetails()
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
  } finally {
    pageLoading.value = false
  }
}

async function generate() {
  try {
    await generateInviteCode()
    msg.success(t('common.success'))
    await load()
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
  }
}

function parseTransferAmount(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const amount = Number(trimmed)
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) return null
  return amount
}

async function doTransfer() {
  const trimmed = transferAmount.value.trim()
  if (!trimmed) {
    msg.error(t('invite.transferAmountRequired'))
    return
  }
  const amount = parseTransferAmount(trimmed)
  if (amount === null) {
    msg.error(t('invite.transferAmountInvalid'))
    return
  }
  if (amount > available.value) {
    msg.error(t('errors.insufficientCommission'))
    return
  }
  try {
    await transferCommission(amount * 100)
    msg.success(t('common.success'))
    transferOpen.value = false
    transferAmount.value = ''
    await load()
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
  }
}

async function doWithdraw() {
  const account = withdrawAccount.value.trim()
  if (!account) {
    msg.error(t('invite.withdrawAccountRequired'))
    return
  }
  if (!withdrawMethod.value.trim()) {
    msg.error(t('invite.withdrawMethodRequired'))
    return
  }
  try {
    await withdrawCommission({ withdraw_method: withdrawMethod.value.trim(), withdraw_account: account })
    msg.success(t('invite.withdrawSuccess'))
    withdrawOpen.value = false
    withdrawAccount.value = ''
    if (featureEnabled(commConfig.value?.ticket_enable, commConfig.value != null)) {
      router.push('/ticket')
    } else {
      await load()
    }
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
  }
}

function copyLink(code: string) {
  navigator.clipboard.writeText(inviteLink(code)).then(
    () => msg.success(t('profile.copied')),
    () => msg.error(t('errors.requestFailed')),
  )
}

const codeColumns = computed<DataTableColumns<InviteCode>>(() => [
  {
    title: t('invite.code'),
    key: 'code',
    render: (r) =>
      h('div', {}, [
        h('span', {}, r.code),
        h(
          NButton,
          {
            size: 'small',
            type: 'info',
            onClick: (e: MouseEvent) => {
              e.stopPropagation()
              copyLink(r.code)
            },
          },
          { default: () => t('invite.copyLink') },
        ),
      ]),
  },
  {
    title: t('invite.createdAt'),
    key: 'created_at',
    fixed: 'right',
    align: 'right',
    render: (r) => formatFixedDateTime(r.created_at),
  },
])

const detailColumns = computed(() => [
  {
    title: t('invite.incomeTime'),
    key: 'created_at',
    render: (r: { created_at?: number }) => formatFixedDateTime(r.created_at),
  },
  {
    title: t('invite.incomeAmount'),
    key: 'get_amount',
    fixed: 'right',
    align: 'right',
    render: (r: { get_amount?: number }) => formatPriceSpaced(r.get_amount ?? 0),
  },
])

onMounted(async () => {
  await loadCurrency()
  await loadGuest()
  await load()
  const cfg = await loadComm()
  const methods = cfg.withdraw_methods
  if (Array.isArray(methods) && methods.length) {
    withdrawMethod.value = String(methods[0])
  }
})
</script>

<template>
  <n-spin :show="pageLoading">
  <n-card v-if="showCommissionFinance" :title="t('invite.title')" class="invite-balance-card rounded-md">
    <template #header-extra>
      <svg class="inline-block text-4xl text-gray-500" viewBox="0 0 24 24" width="1em" height="1em">
        <path
          fill="currentColor"
          d="M19 17v2H7v-2s0-4 6-4s6 4 6 4m-3-9a3 3 0 1 0-3 3a3 3 0 0 0 3-3m3.2 5.06A5.6 5.6 0 0 1 21 17v2h3v-2s0-3.45-4.8-3.94M18 5a2.9 2.9 0 0 0-.89.14a5 5 0 0 1 0 5.72A2.9 2.9 0 0 0 18 11a3 3 0 0 0 0-6M8 10H5V7H3v3H0v2h3v3h2v-3h3Z"
        />
      </svg>
    </template>
    <div>
      <span class="text-5xl font-normal">
        <n-number-animation :from="0" :to="available" :active="true" :precision="2" :duration="500" />
      </span>
      <span class="ml-2.5 text-xl text-gray-500 md:ml-5">{{ currencyCode }}</span>
    </div>
    <div class="text-gray-500">{{ t('invite.available') }}</div>
    <n-space class="invite-balance-actions mt-2.5" :size="[12, 8]">
      <n-button v-if="!commConfig?.withdraw_close" size="small" type="primary" @click="transferOpen = true">
        <template #icon>
          <n-icon><TransferIcon /></n-icon>
        </template>
        {{ t('invite.transfer') }}
      </n-button>
      <n-button v-if="!commConfig?.withdraw_close" size="small" type="primary" @click="withdrawOpen = true">
        <template #icon>
          <n-icon><WithdrawIcon /></n-icon>
        </template>
        {{ t('invite.withdraw') }}
      </n-button>
    </n-space>
  </n-card>

  <n-card v-if="showCommissionFinance" class="mt-4 rounded-md" :bordered="true">
    <div class="flex justify-between pb-1 pt-1">
      <div>{{ t('invite.registered') }}</div>
      <div>{{ t('invite.peopleCount', { number: stat[0] ?? 0 }) }}</div>
    </div>
    <div class="flex justify-between pb-1 pt-1">
      <div>{{ t('invite.commissionRate') }}</div>
      <div>{{ commissionRateLabel }}</div>
    </div>
    <div class="flex justify-between pb-1 pt-1">
      <div>{{ t('invite.pendingCommission') }}</div>
      <div>{{ formatPriceSpaced(stat[2] ?? 0) }}</div>
    </div>
    <div class="flex justify-between pb-1 pt-1">
      <div>{{ t('invite.totalCommission') }}</div>
      <div>{{ formatPriceSpaced(stat[1] ?? 0) }}</div>
    </div>
  </n-card>

  <n-card :title="t('invite.codeMgmt')" class="invite-code-card mt-4 rounded-md">
    <template #header-extra>
      <n-button size="small" type="primary" round @click="generate">
        {{ t('invite.generate') }}
      </n-button>
    </template>
    <n-data-table class="invite-data-table" :columns="codeColumns" :data="paginatedCodes" :bordered="true" />
    <n-pagination
      v-if="showCodesPagination"
      v-model:page="codesPage"
      class="invite-pagination"
      :item-count="codes.length"
      :page-size="INVITE_PAGE_SIZE"
      :prefix="paginationPrefix"
    />
  </n-card>

  <n-card :title="t('invite.incomeRecord')" v-if="showCommissionFinance" class="mt-4 rounded-md">
    <n-data-table
      class="invite-data-table"
      :columns="detailColumns"
      :data="details"
      :bordered="true"
      :pagination="detailTablePagination"
    />
  </n-card>

  <n-modal v-model:show="transferOpen" preset="card" :title="t('invite.transfer')" style="width: 400px">
    <p v-if="withdrawLimitLabel" class="withdraw-hint">{{ withdrawLimitLabel }}</p>
    <n-input v-model:value="transferAmount" :placeholder="t('invite.transferAmount')" />
    <div class="modal-actions">
      <n-button @click="transferOpen = false">{{ t('common.cancel') }}</n-button>
      <n-button type="primary" @click="doTransfer">{{ t('common.confirm') }}</n-button>
    </div>
  </n-modal>

  <n-modal v-model:show="withdrawOpen" preset="card" :title="t('invite.withdraw')" style="width: 400px">
    <p v-if="withdrawLimitLabel" class="withdraw-hint">{{ withdrawLimitLabel }}</p>
    <p v-if="withdrawFeeLabel" class="withdraw-hint">{{ withdrawFeeLabel }}</p>
    <p class="withdraw-hint">{{ t('invite.withdrawFullBalanceHint') }}</p>
    <n-select
      v-if="commConfig?.withdraw_methods?.length"
      v-model:value="withdrawMethod"
      :options="(commConfig.withdraw_methods as string[]).map((m) => ({ label: m, value: m }))"
      style="margin-bottom: 12px"
    />
    <n-input v-else v-model:value="withdrawMethod" :placeholder="t('ticket.withdrawMethod')" style="margin-bottom: 12px" />
    <n-input v-model:value="withdrawAccount" :placeholder="t('ticket.withdrawAccount')" />
    <div class="modal-actions">
      <n-button @click="withdrawOpen = false">{{ t('common.cancel') }}</n-button>
      <n-button type="primary" @click="doWithdraw">{{ t('common.confirm') }}</n-button>
    </div>
  </n-modal>
  </n-spin>
</template>

<style scoped>
.invite-pagination {
  margin-top: 16px;
  justify-content: flex-end;
}
.modal-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
.withdraw-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--xb-text-secondary, #666);
}
</style>
