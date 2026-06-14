<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NAlert, NCard, NButton, NCarousel, NList, NListItem, NModal, NProgress, NSkeleton, NSpace, useMessage } from 'naive-ui'
import ClientImportModal from '@/components/ClientImportModal.vue'
import { renderCarbonIcon } from '@/utils/carbon-icon'
import { formatBytes, formatExpire } from '@/lib/format-traffic'
import { useAuthStore } from '@/stores/auth'
import { fetchSubscribe, type SubscribeInfo } from '@/api/subscribe'
import { fetchNotices, type NoticeItem } from '@/api/notice'
import { fetchUserStat } from '@/api/user'
import { resolveTrafficWarnRate } from '@/api/comm'
import { useUserCommConfig } from '@/composables/useUserCommConfig'
import { useI18n } from '@/i18n'
import { resolveApiError } from '@/lib/api-errors'
import { featureEnabled } from '@/lib/feature-flags'
import { resolvePopupNoticeTags } from '@/utils/settings'
import DOMPurify from 'dompurify'

const auth = useAuthStore()
const { config: commConfig, load: loadComm } = useUserCommConfig()
const msg = useMessage()
const router = useRouter()
const { t, locale } = useI18n()
const subscribe = ref<SubscribeInfo | null>(null)
const subscribeUrl = ref('')
const hasPlan = ref(false)
const loading = ref(true)
const clientModalOpen = ref(false)
const notices = ref<NoticeItem[]>([])
const popupNotice = ref<NoticeItem | null>(null)
const unpaidOrders = ref(0)
const openTickets = ref(0)
const ticketsEnabled = computed(() => featureEnabled(commConfig.value?.ticket_enable, commConfig.value != null))

const promoNotices = computed(() => notices.value.filter((n) => n.img_url))
const popupNoticeTags = computed(() =>
  resolvePopupNoticeTags(
    t('dashboard.popupNoticeTags')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  ),
)
const sanitizedPopupContent = computed(() =>
  popupNotice.value?.content ? DOMPurify.sanitize(popupNotice.value.content) : '',
)
const hasActiveSubscription = computed(() => {
  const sub = subscribe.value
  if (!sub?.plan) return false
  const expiredAt = sub.expired_at
  if (expiredAt === null) return true
  return expiredAt > Date.now() / 1000
})

const trafficWarnThreshold = computed(() => resolveTrafficWarnRate(commConfig.value))

const showTrafficAlert = computed(
  () => hasActiveSubscription.value && trafficUsagePercent.value >= trafficWarnThreshold.value,
)

async function load() {
  loading.value = true
  try {
    const sub = await fetchSubscribe()
    subscribe.value = sub
    hasPlan.value = Boolean(sub.plan)
    subscribeUrl.value = hasPlan.value ? sub.subscribe_url : ''
  } catch (e: unknown) {
    subscribeUrl.value = ''
    hasPlan.value = false
    msg.error(resolveApiError(e, t, t('errors.requestFailed')))
  } finally {
    loading.value = false
  }
}

const usedTraffic = computed(() => (subscribe.value?.u ?? 0) + (subscribe.value?.d ?? 0))
const totalTraffic = computed(() => subscribe.value?.transfer_enable ?? subscribe.value?.plan?.transfer_enable ?? 0)
const trafficUsagePercent = computed(() => {
  if (!totalTraffic.value) return 0
  return Math.min(100, (usedTraffic.value / totalTraffic.value) * 100)
})

function copySubscribe() {
  if (!subscribeUrl.value) return
  navigator.clipboard
    .writeText(subscribeUrl.value)
    .then(() => msg.success(t('profile.copied')))
    .catch(() => msg.error(t('errors.requestFailed')))
}

function openClientImport() {
  if (!subscribeUrl.value) return
  clientModalOpen.value = true
}

async function loadNotices() {
  try {
    notices.value = await fetchNotices()
    const needles = popupNoticeTags.value
    const popup = notices.value.find((n) =>
      n.tags?.some((tag) => needles.some((needle) => tag.includes(needle))),
    )
    if (popup) popupNotice.value = popup
  } catch (e: unknown) {
    notices.value = []
    msg.error(resolveApiError(e, t, t('errors.requestFailed')))
  }
}

onMounted(async () => {
  await auth.loadUser()
  await Promise.all([load(), loadNotices()])
  try {
    await loadComm()
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t, t('errors.requestFailed')))
  }
  try {
    const stat = await fetchUserStat()
    unpaidOrders.value = stat[0] ?? 0
    if (ticketsEnabled.value) {
      openTickets.value = stat[1] ?? 0
    }
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t, t('errors.requestFailed')))
  }
})

const shortcuts = computed(() => {
  const items = [
  {
    icon: renderCarbonIcon(
      'M12 21.5c-1.35-.85-3.8-1.5-5.5-1.5c-1.65 0-3.35.3-4.75 1.05c-.1.05-.15.05-.25.05c-.25 0-.5-.25-.5-.5V6c.6-.45 1.25-.75 2-1c1.11-.35 2.33-.5 3.5-.5c1.95 0 4.05.4 5.5 1.5c1.45-1.1 3.55-1.5 5.5-1.5c1.17 0 2.39.15 3.5.5c.75.25 1.4.55 2 1v14.6c0 .25-.25.5-.5.5c-.1 0-.15 0-.25-.05c-1.4-.75-3.1-1.05-4.75-1.05c-1.7 0-4.15.65-5.5 1.5M12 8v11.5c1.35-.85 3.8-1.5 5.5-1.5c1.2 0 2.4.15 3.5.5V7c-1.1-.35-2.3-.5-3.5-.5c-1.7 0-4.15.65-5.5 1.5m1 3.5c1.11-.68 2.6-1 4.5-1c.91 0 1.76.09 2.5.28V9.23c-.87-.15-1.71-.23-2.5-.23q-2.655 0-4.5.84zm4.5.17c-1.71 0-3.21.26-4.5.79v1.69c1.11-.65 2.6-.99 4.5-.99c1.04 0 1.88.08 2.5.24v-1.5c-.87-.16-1.71-.23-2.5-.23m2.5 2.9c-.87-.16-1.71-.24-2.5-.24c-1.83 0-3.33.27-4.5.8v1.69c1.11-.66 2.6-.99 4.5-.99c1.04 0 1.88.08 2.5.24z',
      '0 0 24 24',
      'inline',
    ),
    titleKey: 'dashboard.viewTutorial',
    descKey: 'dashboard.viewTutorialDesc',
    to: '/knowledge',
  },
  {
    icon: renderCarbonIcon(
      'M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27zm0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93z',
      '0 0 24 24',
      'inline',
    ),
    titleKey: 'dashboard.quickSub',
    descKey: 'dashboard.quickSubDesc',
    action: openClientImport,
  },
  {
    icon: renderCarbonIcon(
      'M12 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8a8 8 0 0 0-8 8a8 8 0 0 0 8 8m0-18a10 10 0 0 1 10 10a10 10 0 0 1-10 10C6.47 22 2 17.5 2 12A10 10 0 0 1 12 2m.5 5v5.25l4.5 2.67l-.75 1.23L11 13V7z',
      '0 0 24 24',
      'inline',
    ),
    titleKey: 'dashboard.purchase',
    descKey: 'dashboard.purchaseDesc',
    to: '/plan',
  },
  ]
  if (ticketsEnabled.value) {
    items.push({
      icon: renderCarbonIcon(
        'M20 2H4c-.53 0-1.04.21-1.41.59C2.21 2.96 2 3.47 2 4v12c0 .53.21 1.04.59 1.41c.37.38.88.59 1.41.59h4l4 4l4-4h4c.53 0 1.04-.21 1.41-.59S22 16.53 22 16V4c0-.53-.21-1.04-.59-1.41C21.04 2.21 20.53 2 20 2M4 16V4h16v12h-4.83L12 19.17L8.83 16m1.22-9.96c.54-.36 1.25-.54 2.14-.54c.94 0 1.69.21 2.23.62q.81.63.81 1.68c0 .44-.15.83-.44 1.2c-.29.36-.67.64-1.13.85c-.26.15-.43.3-.52.47c-.09.18-.14.4-.14.68h-2c0-.5.1-.84.29-1.08c.21-.24.55-.52 1.07-.84c.26-.14.47-.32.64-.54c.14-.21.22-.46.22-.74c0-.3-.09-.52-.27-.69c-.18-.18-.45-.26-.76-.26c-.27 0-.49.07-.69.21c-.16.14-.26.35-.26.63H9.27c-.05-.69.23-1.29.78-1.65M11 14v-2h2v2Z',
        '0 0 24 24',
        'inline',
      ),
      titleKey: 'dashboard.problem',
      descKey: 'dashboard.problemDesc',
      to: '/ticket',
    })
  }
  return items
})

function onShortcut(item: { to?: string; action?: () => void }) {
  if (item.action) item.action()
  else if (item.to) router.push(item.to)
}
</script>

<template>
  <div class="mb-1 md:mb-10">
  <div class="dash-alerts">
    <n-alert
      v-if="ticketsEnabled && openTickets > 0"
      type="warning"
      :show-icon="false"
      bordered
      closable
      class="mb-1"
    >
      {{ t('dashboard.openTickets', { count: openTickets }) }}
      <n-button text strong @click="router.push('/ticket')">{{ t('dashboard.goView') }}</n-button>
    </n-alert>
    <n-alert
      v-if="unpaidOrders > 0"
      type="error"
      :show-icon="false"
      bordered
      closable
      class="mb-1"
    >
      {{ t('dashboard.unpaidOrders', { count: unpaidOrders }) }}
      <n-button text strong @click="router.push('/order')">{{ t('dashboard.payNow') }}</n-button>
    </n-alert>
    <n-alert
      v-if="showTrafficAlert"
      type="info"
      :show-icon="false"
      bordered
      closable
      class="mb-1"
    >
      {{ t('dashboard.trafficWarning', { percent: trafficUsagePercent.toFixed(0) }) }}
      <n-button text @click="router.push('/plan')">
        <span class="dash-traffic-link">{{ t('dashboard.learnAndBuy') }}</span>
      </n-button>
    </n-alert>
  </div>

  <n-carousel
    v-if="promoNotices.length"
    autoplay
    :interval="5000"
    show-arrow
    dot-type="line"
    dot-placement="bottom"
    class="dash-promo-carousel"
  >
    <img
      v-for="n in promoNotices"
      :key="n.id"
      class="dash-promo-img"
      :src="n.img_url!"
      :alt="n.title"
      @click="popupNotice = n"
    />
  </n-carousel>

  <n-card :title="t('dashboard.mySubscription')" class="mt-1 rounded-md md:mt-5">
    <template v-if="loading">
      <n-space :size="[12, 8]">
        <n-skeleton text style="height: 20px; width: 33%" />
        <n-skeleton text style="height: 20px; width: 66%" />
        <n-skeleton text style="height: 20px; width: 100%" />
      </n-space>
    </template>
    <template v-else-if="hasPlan && subscribeUrl">
      <div v-if="subscribe?.plan?.name" class="sub-plan-name">{{ subscribe.plan.name }}</div>
      <div class="sub-meta">
        <span>{{ t('dashboard.expireAt') }}: {{ formatExpire(subscribe?.expired_at, locale) }}</span>
        <span v-if="subscribe?.reset_day != null">{{ t('dashboard.resetDay', { day: subscribe.reset_day }) }}</span>
      </div>
      <div class="sub-traffic">
        <span>{{ formatBytes(usedTraffic) }} / {{ formatBytes(totalTraffic) }}</span>
        <n-progress type="line" :percentage="trafficUsagePercent" :show-indicator="false" status="success" />
      </div>
      <n-space>
        <n-button type="primary" @click="copySubscribe">{{ t('dashboard.copyLink') }}</n-button>
        <n-button @click="openClientImport">{{ t('dashboard.quickSub') }}</n-button>
      </n-space>
    </template>
    <template v-else>
      <div class="cursor-pointer pt-5 text-center" @click="router.push('/plan')">
        <svg class="inline-block text-4xl" viewBox="0 0 24 24" width="1em" height="1em">
          <g fill="none">
            <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
            <path fill="currentColor" d="M10.5 20a1.5 1.5 0 0 0 3 0v-6.5H20a1.5 1.5 0 0 0 0-3h-6.5V4a1.5 1.5 0 0 0-3 0v6.5H4a1.5 1.5 0 0 0 0 3h6.5z" />
          </g>
        </svg>
        <div class="text-gray-500">{{ t('dashboard.purchaseSubscription') }}</div>
      </div>
    </template>
  </n-card>

  <n-card
    :title="t('dashboard.shortcut')"
    class="mt-5 rounded-md dash-card--shortcuts"
    :content-style="{ padding: 0 }"
  >
    <n-list show-divider hoverable clickable>
      <n-list-item
        v-for="(item, idx) in shortcuts"
        :key="idx"
        class="flex cursor-pointer justify-between p-5 hover:bg-gray-100"
        @click="onShortcut(item)"
      >
        <div class="flex items-center justify-between shortcut-row">
          <div>
            <div class="text-base">{{ t(item.titleKey) }}</div>
            <div class="text-sm text-gray-500">{{ t(item.descKey) }}</div>
          </div>
          <div>
            <component :is="item.icon" class="inline-block text-3xl text-gray-500" />
          </div>
        </div>
      </n-list-item>
    </n-list>
  </n-card>

  <ClientImportModal v-model:show="clientModalOpen" :subscribe-url="subscribeUrl" />

  <n-modal
    :show="Boolean(popupNotice)"
    preset="card"
    :title="popupNotice?.title ?? ''"
    style="width: min(560px, 92vw)"
    @update:show="(v: boolean) => { if (!v) popupNotice = null }"
  >
    <div v-if="popupNotice" v-html="sanitizedPopupContent" />
  </n-modal>
  </div>
</template>

<style scoped>
.sub-plan-name { font-size: 16px; font-weight: 500; margin-bottom: 8px; }
.sub-meta { display: flex; flex-wrap: wrap; gap: 16px; color: var(--xb-text-muted); font-size: 14px; margin-bottom: 12px; }
.sub-traffic { margin-bottom: 16px; font-size: 14px; color: var(--xb-text); }
.sub-traffic .n-progress { margin-top: 8px; }
.dash-promo-carousel {
  border-radius: 6px;
  overflow: hidden;
  max-height: 180px;
}
.dash-promo-carousel :deep(.n-carousel__arrow-group) {
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.dash-promo-carousel:hover :deep(.n-carousel__arrow-group),
.dash-promo-carousel:focus-within :deep(.n-carousel__arrow-group) {
  opacity: 1;
  pointer-events: auto;
}
.dash-promo-carousel--empty {
  max-height: 0;
  margin: 0;
  overflow: hidden;
}
.dash-traffic-link {
  color: inherit;
}
.dash-promo-img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  cursor: pointer;
}
.mt-5 { margin-top: 20px; }
.dash-card--shortcuts :deep(.n-card-content),
.dash-card--shortcuts :deep(.n-card__content) {
  padding: 0 !important;
}
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.p-5 { padding: 20px; }
.shortcut-row {
  width: 100%;
}
.hover\:bg-gray-100:hover { background: var(--xb-hover); }
.text-base { font-size: 16px; font-weight: 400; line-height: 24px; color: var(--xb-text); }
.text-sm { font-size: 14px; line-height: 22.4px; }
.text-gray-500 { color: var(--xb-text-secondary); }
.cursor-pointer { cursor: pointer; }
.pt-5 { padding-top: 20px; }
.text-center { text-align: center; }
.text-4xl { font-size: 36px; color: var(--xb-text); }
.inline-block { display: inline-block; }
.dash-card :deep(.text-gray-500) {
  font-size: 14px;
  line-height: 22.4px;
  color: var(--xb-text-secondary);
}
.text-3xl { font-size: 30px; line-height: 36px; }
.inline-block { display: inline-block; }
:deep(.n-list .n-list-item) {
  height: 68px;
  overflow: hidden;
  box-sizing: border-box;
}
:deep(.n-list .n-list-item .n-list-item__main) {
  width: 100%;
}
</style>
