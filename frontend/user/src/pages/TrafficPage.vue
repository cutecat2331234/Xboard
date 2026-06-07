<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NCard, NDataTable } from 'naive-ui'
import { fetchTrafficLog } from '@/api/traffic'
import { useI18n } from '@/i18n'

const rows = ref<{ record_at: number; u: number; d: number }[]>([])
const { t } = useI18n()

function gb(n: number) {
  return (n / 1073741824).toFixed(3)
}

onMounted(async () => {
  rows.value = await fetchTrafficLog()
})
</script>

<template>
  <h2 class="page-title">{{ t('nav.traffic') }}</h2>
  <n-card>
    <n-data-table
      :columns="[
        { title: 'Date', key: 'record_at', render: (r) => new Date(r.record_at * 1000).toLocaleDateString() },
        { title: 'Upload', key: 'u', render: (r) => gb(r.u) + ' GB' },
        { title: 'Download', key: 'd', render: (r) => gb(r.d) + ' GB' },
      ]"
      :data="rows"
    />
  </n-card>
</template>
