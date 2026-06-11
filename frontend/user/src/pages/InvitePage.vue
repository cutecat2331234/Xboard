<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NDataTable,
  NModal,
  NInput,
  NPagination,
  NSelect,
  NSpace,
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
import { useCurrency } from '@/composables/useCurrency'
import { formatLocaleDateTime } from '@/lib/format-date'
import { useI18n } from '@/i18n'

const INVITE_PAGE_SIZE = 10

const codes = ref<InviteCode[]>([])
const stat = ref<number[]>([0, 0, 0, 0, 0])
const details = ref<Array<{ created_at?: number; get_amount?: number }>>([])
const codesPage = ref(1)
const detailsPage = ref(1)
const msg = useMessage()
const router = useRouter()
const { t, locale } = useI18n()
const { formatPrice, load: loadCurrency, code: currencyCode } = useCurrency()
const transferOpen = ref(false)
const withdrawOpen = ref(false)
const transferAmount = ref('')
const { config: commConfig, load: loadComm } = useUserCommConfig()
const withdrawMethod = ref('Alipay')
const withdrawAccount = ref('')

const available = computed(() => (stat.value[4] ?? 0) / 100)

const showCodesPagination = computed(() => codes.value.length > INVITE_PAGE_SIZE)
const showDetailsPagination = computed(() => details.value.length > INVITE_PAGE_SIZE)

const paginatedCodes = computed(() => {
  if (!showCodesPagination.value) return codes.value
  const start = (codesPage.value - 1) * INVITE_PAGE_SIZE
  return codes.value.slice(start, start + INVITE_PAGE_SIZE)
})

const paginatedDetails = computed(() => {
  if (!showDetailsPagination.value) return details.value
  const start = (detailsPage.value - 1) * INVITE_PAGE_SIZE
  return details.value.slice(start, start + INVITE_PAGE_SIZE)
})

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

watch(
  () => details.value.length,
  () => {
    const maxPage = Math.max(1, Math.ceil(details.value.length / INVITE_PAGE_SIZE))
    if (detailsPage.value > maxPage) detailsPage.value = maxPage
  },
)

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

function inviteLink(code: string) {
  return `${window.location.origin}${window.location.pathname}#/register?code=${code}`
}

async function load() {
  const data = await fetchInvite()
  codes.value = data.codes ?? []
  stat.value = data.stat ?? [0, 0, 0, 0, 0]
  try {
    const res = await fetchInviteDetails()
    details.value = (res as { data?: typeof details.value }).data ?? []
  } catch {
    details.value = []
  }
}

async function generate() {
  try {
    await generateInviteCode()
    msg.success(t('common.success'))
    await load()
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : t('common.error'))
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
  try {
    await transferCommission(amount)
    msg.success(t('common.success'))
    transferOpen.value = false
    transferAmount.value = ''
    await load()
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : t('common.error'))
  }
}

async function doWithdraw() {
  try {
    await withdrawCommission({ withdraw_method: withdrawMethod.value, withdraw_account: withdrawAccount.value })
    msg.success(t('invite.withdrawSuccess'))
    withdrawOpen.value = false
    withdrawAccount.value = ''
    router.push('/ticket')
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : t('common.error'))
  }
}

function copyLink(code: string) {
  navigator.clipboard.writeText(inviteLink(code))
  msg.success(t('common.success'))
}

function renderCopyLinkButton(code: string) {
  return h(
    'button',
    {
      class: 'n-button n-button--info-type n-button--small-type invite-copy-link-btn',
      type: 'button',
      tabindex: 0,
      onClick: (e: MouseEvent) => {
        e.stopPropagation()
        copyLink(code)
      },
    },
    [
      h('span', { class: 'n-button__content' }, t('invite.copyLink')),
      h('div', { 'aria-hidden': 'true', class: 'n-base-wave' }),
    ],
  )
}

const codeColumns = computed<DataTableColumns<InviteCode>>(() => [
  {
    title: t('invite.code'),
    key: 'code',
    width: 502,
    render: (r) => h('div', {}, [h('span', {}, r.code), renderCopyLinkButton(r.code)]),
  },
  {
    title: t('invite.createdAt'),
    key: 'created_at',
    width: 474,
    render: (r) => formatLocaleDateTime(r.created_at, locale.value),
  },
])

const detailColumns = computed(() => [
  {
    title: t('invite.incomeTime'),
    key: 'created_at',
    width: 592,
    render: (r: { created_at?: number }) => formatLocaleDateTime(r.created_at, locale.value),
  },
  {
    title: t('invite.incomeAmount'),
    key: 'get_amount',
    width: 384,
    render: (r: { get_amount?: number }) => formatPrice(r.get_amount ?? 0),
  },
])

onMounted(async () => {
  await loadCurrency()
  await load()
  const cfg = await loadComm()
  const methods = cfg.withdraw_methods
  if (Array.isArray(methods) && methods.length) {
    withdrawMethod.value = String(methods[0])
  }
})
</script>

<template>
  <n-card :title="t('invite.title')" class="invite-balance-card rounded-md">
    <template #header-extra>
      <svg class="inline-block text-4xl text-gray-500" viewBox="0 0 24 24" width="1em" height="1em">
        <path
          fill="currentColor"
          d="M19 17v2H7v-2s0-4 6-4s6 4 6 4m-3-9a3 3 0 1 0-3 3a3 3 0 0 0 3-3m3.2 5.06A5.6 5.6 0 0 1 21 17v2h3v-2s0-3.45-4.8-3.94M18 5a2.9 2.9 0 0 0-.89.14a5 5 0 0 1 0 5.72A2.9 2.9 0 0 0 18 11a3 3 0 0 0 0-6M8 10H5V7H3v3H0v2h3v3h2v-3h3Z"
        />
      </svg>
    </template>
    <div>
      <span class="text-5xl font-normal">{{ available.toFixed(2) }}</span>
      <span class="ml-2.5 text-xl text-gray-500 md:ml-5">{{ currencyCode }}</span>
    </div>
    <div class="text-gray-500">{{ t('invite.available') }}</div>
    <n-space class="invite-balance-actions mt-2.5" :size="[12, 8]">
      <button
        class="n-button n-button--primary-type n-button--small-type invite-primary-btn"
        type="button"
        tabindex="0"
        @click="transferOpen = true"
      >
        <span class="n-button__content">{{ t('invite.transfer') }}</span>
        <div aria-hidden="true" class="n-base-wave" />
      </button>
      <button
        v-if="!commConfig?.withdraw_close"
        class="n-button n-button--primary-type n-button--small-type invite-primary-btn"
        type="button"
        tabindex="0"
        @click="withdrawOpen = true"
      >
        <span class="n-button__content">{{ t('invite.withdraw') }}</span>
        <div aria-hidden="true" class="n-base-wave" />
      </button>
    </n-space>
  </n-card>

  <n-card class="mt-5 rounded-md" :bordered="true">
    <div class="flex justify-between pb-1 pt-1">
      <div>{{ t('invite.registered') }}</div>
      <div>{{ stat[0] ?? 0 }} {{ t('invite.people') }}</div>
    </div>
    <div class="flex justify-between pb-1 pt-1">
      <div>{{ t('invite.commissionRate') }}</div>
      <div>{{ commissionRateLabel }}</div>
    </div>
    <div class="flex justify-between pb-1 pt-1">
      <div>{{ t('invite.pendingCommission') }}</div>
      <div>{{ formatPrice(stat[2] ?? 0) }}</div>
    </div>
    <div class="flex justify-between pb-1 pt-1">
      <div>{{ t('invite.totalCommission') }}</div>
      <div>{{ formatPrice(stat[1] ?? 0) }}</div>
    </div>
  </n-card>

  <n-card :title="t('invite.codeMgmt')" class="invite-code-card mt-4 rounded-md">
    <template #header-extra>
      <button
        class="n-button n-button--primary-type n-button--small-type invite-primary-btn"
        type="button"
        tabindex="0"
        @click="generate"
      >
        <span class="n-button__content">{{ t('invite.generate') }}</span>
        <div aria-hidden="true" class="n-base-wave" />
      </button>
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

  <n-card :title="t('invite.incomeRecord')" class="mt-5 rounded-md">
    <n-data-table class="invite-data-table" :columns="detailColumns" :data="paginatedDetails" :bordered="true" />
    <n-pagination
      v-if="showDetailsPagination"
      v-model:page="detailsPage"
      class="invite-pagination"
      :item-count="details.length"
      :page-size="INVITE_PAGE_SIZE"
      :prefix="paginationPrefix"
    />
  </n-card>

  <n-modal v-model:show="transferOpen" preset="card" :title="t('invite.transfer')" style="width: 400px">
    <n-input v-model:value="transferAmount" :placeholder="t('invite.transferAmount')" />
    <div class="modal-actions">
      <n-button @click="transferOpen = false">{{ t('common.cancel') }}</n-button>
      <n-button type="primary" @click="doTransfer">{{ t('common.confirm') }}</n-button>
    </div>
  </n-modal>

  <n-modal v-model:show="withdrawOpen" preset="card" :title="t('invite.withdraw')" style="width: 400px">
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
</template>

<style scoped>
.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
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
</style>
