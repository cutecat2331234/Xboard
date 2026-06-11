<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NAlert, NCard, NDataTable, NTag } from 'naive-ui'
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
  <n-alert v-if="!loading && servers.length === 0" type="info" :show-icon="true">
    {{ t('node.alert') }}
    <a href="#/plan" class="node-link" @click.prevent="router.push('/plan')">{{ t('node.subscribe') }}</a>。
  </n-alert>

  <n-card v-else-if="servers.length > 0" class="rounded-md">
    <n-data-table :columns="columns" :data="servers" :bordered="true" />
  </n-card>
</template>

<style scoped>
.node-link {
  color: #2080f0;
  cursor: pointer;
  text-decoration: none;
  margin-left: 4px;
}
.node-link:hover { text-decoration: underline; }
</style>
