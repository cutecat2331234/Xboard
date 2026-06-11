<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NCard, NDataTable, NEmpty } from 'naive-ui'
import { fetchTrafficLog } from '@/api/traffic'
import { formatLocaleDate } from '@/lib/format-date'
import { useI18n } from '@/i18n'

const rows = ref<{ record_at: number; u: number; d: number; rate?: number }[]>([])
const { t, locale } = useI18n()

function gb(n: number) {
  return (n / 1073741824).toFixed(3)
}

const columns = computed(() => [
  {
    title: t('traffic.recordAt'),
    key: 'record_at',
    render: (r: { record_at: number }) => formatLocaleDate(r.record_at, locale.value),
  },
  { title: t('traffic.upload'), key: 'u', render: (r: { u: number }) => `${gb(r.u)} GB` },
  { title: t('traffic.download'), key: 'd', render: (r: { d: number }) => `${gb(r.d)} GB` },
  { title: t('traffic.rate'), key: 'rate', render: (r: { rate?: number }) => String(r.rate ?? 1) },
  {
    title: t('traffic.total'),
    key: 'total',
    render: (r: { u: number; d: number }) => `${gb(r.u + r.d)} GB`,
  },
])

onMounted(async () => {
  rows.value = await fetchTrafficLog()
})
</script>

<template>
  <n-card class="traffic-card">
    <p class="traffic-hint">{{ t('traffic.hint') }}</p>
    <n-empty v-if="rows.length === 0" :description="t('traffic.empty')" />
    <n-data-table v-else :columns="columns" :data="rows" :bordered="false" />
  </n-card>
</template>

<style scoped>
.traffic-card :deep(.n-card-content),
.traffic-card :deep(.n-card__content) {
  padding: 20px 24px;
}
.traffic-hint {
  margin: 0 0 8px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}
</style>
