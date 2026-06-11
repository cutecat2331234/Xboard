<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCard, NDataTable, NEmpty, NSkeleton, NTag } from 'naive-ui'
import { fetchServers, type ServerNode } from '@/api/server'
import { useI18n } from '@/i18n'

const router = useRouter()
const { t } = useI18n()
const loading = ref(true)
const servers = ref<ServerNode[]>([])

const columns = computed(() => [
  { title: t('node.name'), key: 'name' },
  { title: t('node.type'), key: 'type' },
  { title: t('node.rate'), key: 'rate', render: (r: ServerNode) => String(r.rate ?? 1) },
  {
    title: t('node.status'),
    key: 'is_online',
    render: (r: ServerNode) =>
      h(
        NTag,
        { type: r.is_online ? 'success' : 'default', size: 'small', bordered: false },
        { default: () => (r.is_online ? t('node.online') : t('node.offline')) },
      ),
  },
])

onMounted(async () => {
  try {
    servers.value = await fetchServers()
  } catch {
    servers.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <n-card v-if="loading" class="rounded-md">
    <n-skeleton text style="height: 20px; width: 100%" />
    <n-skeleton text style="height: 20px; width: 100%; margin-top: 12px" />
    <n-skeleton text style="height: 20px; width: 100%; margin-top: 12px" />
    <n-skeleton text style="height: 20px; width: 100%; margin-top: 12px" />
    <n-skeleton text style="height: 20px; width: 100%; margin-top: 12px" />
  </n-card>
  <n-empty v-else-if="servers.length === 0" :description="t('node.empty')">
    <template #extra>
      <n-button type="primary" size="small" @click="router.push('/plan')">{{ t('node.subscribe') }}</n-button>
    </template>
  </n-empty>
  <n-card v-else class="rounded-md">
    <n-data-table :columns="columns" :data="servers" :bordered="true" />
  </n-card>
</template>
