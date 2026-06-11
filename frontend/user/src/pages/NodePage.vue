<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { NAlert, NIcon, NList, NListItem, NPopover, NSkeleton, NSpace, NTag } from 'naive-ui'
import { HelpCircleOutline } from '@vicons/ionicons5'
import { fetchServers, type ServerNode } from '@/api/server'
import { useI18n } from '@/i18n'

const { t } = useI18n()
const loading = ref(true)
const servers = ref<ServerNode[]>([])

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
  <n-space v-if="loading" vertical class="node-loading">
    <n-skeleton height="20px" width="33%" />
    <n-skeleton height="20px" width="66%" />
    <n-skeleton height="20px" />
  </n-space>

  <n-list v-else-if="servers.length > 0" clickable hoverable class="node-list rounded-md">
    <template #header>
      <div class="node-header">
        <div class="node-col-name">{{ t('node.name') }}</div>
        <div class="node-col-meta">
          <div class="node-meta-cell">
            {{ t('node.status') }}
            <n-popover trigger="hover" placement="bottom">
              <template #trigger>
                <n-icon :size="16" class="node-help-icon"><help-circle-outline /></n-icon>
              </template>
              {{ t('node.statusHint') }}
            </n-popover>
          </div>
          <div class="node-meta-cell">
            {{ t('node.rate') }}
            <n-popover trigger="hover" placement="bottom">
              <template #trigger>
                <n-icon :size="16" class="node-help-icon"><help-circle-outline /></n-icon>
              </template>
              {{ t('node.rateHint') }}
            </n-popover>
          </div>
          <div class="node-meta-cell node-meta-tags">{{ t('node.tags') }}</div>
        </div>
      </div>
    </template>

    <n-list-item v-for="server in servers" :key="server.id">
      <div class="node-row">
        <div class="node-col-name node-name">{{ server.name }}</div>
        <div class="node-col-meta">
          <div class="node-meta-cell">
            <div
              class="status-dot"
              :class="server.is_online ? 'status-dot--info' : 'status-dot--bad'"
            />
          </div>
          <div class="node-meta-cell">
            <n-tag size="small" round>{{ server.rate }} x</n-tag>
          </div>
          <div class="node-meta-cell node-meta-tags">
            <template v-if="server.tags?.length">
              <n-tag v-for="tag in server.tags" :key="tag" size="small" round>{{ tag }}</n-tag>
            </template>
            <span v-else class="node-tag-empty">-</span>
          </div>
        </div>
      </div>
    </n-list-item>
  </n-list>

  <n-alert v-else type="info">
    {{ t('node.emptyPrefix') }}
    <router-link class="node-subscribe-link" to="/plan">{{ t('node.subscribe') }}</router-link>{{ t('node.emptySuffix') }}
  </n-alert>
</template>

<style scoped>
.node-loading {
  margin-top: 20px;
}
.node-list {
  background: var(--xb-surface);
  border-radius: 6px;
}
.node-list :deep(.n-list-item) {
  padding: 12px 24px;
}
.node-header {
  display: flex;
  padding: 12px 24px;
  font-weight: 500;
}
.node-row {
  display: flex;
  align-items: center;
  width: 100%;
}
.node-col-name {
  flex: 1;
  min-width: 0;
}
.node-name {
  word-break: break-word;
}
.node-col-meta {
  flex: 2;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  text-align: center;
}
.node-meta-cell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.node-meta-tags {
  flex-wrap: wrap;
  gap: 6px;
}
.node-help-icon {
  color: var(--xb-text-muted);
  cursor: help;
}
.node-tag-empty {
  color: var(--xb-text-muted);
}
.node-subscribe-link {
  color: var(--xb-primary);
  font-weight: 600;
  text-decoration: none;
}
.node-subscribe-link:hover {
  text-decoration: underline;
}
</style>
