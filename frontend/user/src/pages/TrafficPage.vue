<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { NAlert, NCard, NDataTable, NEmpty, NIcon, NPopover, NTag } from 'naive-ui'
import { HelpCircleOutline } from '@vicons/ionicons5'
import { fetchTrafficLog } from '@/api/traffic'
import { formatBytes } from '@/lib/format-traffic'
import { formatFixedDate } from '@/lib/format-date'
import { useI18n } from '@/i18n'

interface TrafficRow {
  record_at: number
  u: number
  d: number
  server_rate?: number | string
  rate?: number | string
}

const rows = ref<TrafficRow[]>([])
const { t } = useI18n()

function serverRate(row: TrafficRow): number {
  const raw = row.server_rate ?? row.rate ?? 1
  const n = parseFloat(String(raw))
  return Number.isFinite(n) && n > 0 ? n : 1
}

const columns = computed(() => [
  {
    title: t('traffic.recordAt'),
    key: 'record_at',
    render: (r: TrafficRow) => formatFixedDate(r.record_at),
  },
  {
    title: t('traffic.upload'),
    key: 'u',
    render: (r: TrafficRow) => formatBytes(r.u / serverRate(r)),
  },
  {
    title: t('traffic.download'),
    key: 'd',
    render: (r: TrafficRow) => formatBytes(r.d / serverRate(r)),
  },
  {
    title: t('traffic.rate'),
    key: 'server_rate',
    render: (r: TrafficRow) =>
      h(NTag, { size: 'small', round: true }, { default: () => `${serverRate(r)} x` }),
  },
  {
    title: () =>
      h('div', { class: 'flex items-center traffic-total-title' }, [
        t('traffic.total'),
        h(
          NPopover,
          { trigger: 'hover', placement: 'bottom' },
          {
            trigger: () =>
              h(NIcon, { size: 16, class: 'traffic-help-icon' }, { default: () => h(HelpCircleOutline) }),
            default: () => t('traffic.formula'),
          },
        ),
      ]),
    key: 'total',
    fixed: 'right' as const,
    render: (r: TrafficRow) => formatBytes(r.u + r.d),
  },
])

onMounted(async () => {
  rows.value = await fetchTrafficLog()
})
</script>

<template>
  <n-card class="rounded-md traffic-card">
    <n-alert type="info" :bordered="false" class="traffic-alert">
      {{ t('traffic.hint') }}
    </n-alert>
    <n-empty v-if="rows.length === 0" :description="t('traffic.empty')" />
    <n-data-table v-else :columns="columns" :data="rows" :scroll-x="600" />
  </n-card>
</template>

<style scoped>
.traffic-card :deep(.n-card__content),
.traffic-card :deep(.n-card-content) {
  padding: 20px 24px;
}
.traffic-alert {
  margin-bottom: 20px;
}
.traffic-total-title {
  gap: 4px;
}
.traffic-help-icon {
  color: var(--xb-text-muted);
  cursor: help;
  vertical-align: middle;
}
</style>
