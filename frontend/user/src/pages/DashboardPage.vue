<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { NCard, NGrid, NGi, NStatistic, NButton, NList, NListItem, NThing, useMessage } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { fetchSubscribe } from '@/api/subscribe'
import { fetchNotices } from '@/api/notice'
import type { NoticeItem } from '@/api/notice'
import { useI18n } from '@/i18n'

const auth = useAuthStore()
const msg = useMessage()
const { t } = useI18n()
const subscribeUrl = ref('')
const notices = ref<NoticeItem[]>([])

const remainingGb = computed(() => {
  const u = auth.user
  if (!u) return '--'
  const left = Math.max(0, u.transfer_enable - u.u - u.d)
  return (left / 1073741824).toFixed(2) + ' GB'
})

const expireText = computed(() => {
  const ts = auth.user?.expired_at
  if (!ts) return '--'
  return new Date(ts * 1000).toLocaleDateString()
})

async function load() {
  try {
    const sub = await fetchSubscribe()
    subscribeUrl.value = sub.subscribe_url
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : 'Failed to load subscription')
  }
  try {
    notices.value = await fetchNotices()
  } catch {
    notices.value = []
  }
}

function copySubscribe() {
  if (!subscribeUrl.value) return
  navigator.clipboard.writeText(subscribeUrl.value)
  msg.success('Copied')
}

onMounted(async () => {
  await auth.loadUser()
  await load()
})
</script>

<template>
  <h2 class="page-title">{{ t('nav.dashboard') }}</h2>
  <n-grid :cols="3" :x-gap="12" :y-gap="12">
    <n-gi>
      <n-card>
        <n-statistic :label="t('dashboard.remaining')" :value="remainingGb" />
      </n-card>
    </n-gi>
    <n-gi>
      <n-card>
        <n-statistic :label="t('dashboard.expire')" :value="expireText" />
      </n-card>
    </n-gi>
    <n-gi>
      <n-card>
        <n-statistic :label="t('dashboard.balance')" :value="auth.user?.balance ?? 0" />
      </n-card>
    </n-gi>
  </n-grid>

  <n-card style="margin-top:16px" :title="t('dashboard.subscribe')">
    <n-button type="primary" @click="copySubscribe">{{ t('dashboard.copyLink') }}</n-button>
  </n-card>

  <n-card style="margin-top:16px" :title="t('dashboard.notices')">
    <n-list v-if="notices.length">
      <n-list-item v-for="n in notices" :key="n.id">
        <n-thing :title="n.title" :description="n.content" />
      </n-list-item>
    </n-list>
    <p v-else style="color:#888;margin:0">—</p>
  </n-card>
</template>
