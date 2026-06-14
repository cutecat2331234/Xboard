<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NModal, NButton, NCheckbox, NCheckboxGroup, NSpace, useMessage } from 'naive-ui'
import {
  PROTOCOL_TYPES,
  appendSubscribeTypes,
  buildImportClients,
  detectPlatform,
  filterClientsByPlatform,
} from '@/lib/client-import'
import { getSettings } from '@/utils/settings'
import { useI18n } from '@/i18n'

const props = defineProps<{
  show: boolean
  subscribeUrl: string
}>()

const emit = defineEmits<{ 'update:show': [boolean] }>()

const msg = useMessage()
const { t } = useI18n()
const selectedTypes = ref<string[]>(['auto'])

const platform = detectPlatform()
const siteTitle = getSettings().title || 'Xboard'

const filteredUrl = computed(() => {
  const types = selectedTypes.value
  if (types.includes('auto') || types.length === 0) return props.subscribeUrl
  return appendSubscribeTypes(props.subscribeUrl, types)
})

const clients = computed(() =>
  filterClientsByPlatform(buildImportClients(filteredUrl.value, siteTitle), platform),
)

watch(
  () => props.show,
  (open) => {
    if (open) selectedTypes.value = ['auto']
  },
)

function onClientClick(client: ReturnType<typeof buildImportClients>[number]) {
  if (client.action === 'copy') {
    navigator.clipboard.writeText(filteredUrl.value)
    msg.success(t('profile.copied'))
    return
  }
  if (client.url) window.location.href = client.url
}
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    :title="t('dashboard.clientImportTitle')"
    style="width: min(520px, 92vw)"
    @update:show="emit('update:show', $event)"
  >
    <p class="hint">{{ t('dashboard.clientImportHint') }}</p>
    <n-checkbox-group v-model:value="selectedTypes" class="type-group">
      <n-space>
        <n-checkbox v-for="p in PROTOCOL_TYPES" :key="p.value" :value="p.value" :label="t(p.labelKey)" />
      </n-space>
    </n-checkbox-group>
    <div class="client-list">
      <n-button
        v-for="(c, idx) in clients"
        :key="idx"
        block
        class="client-btn"
        @click="onClientClick(c)"
      >
        <span class="client-btn__inner">
          <img v-if="c.icon" :src="c.icon" :class="['client-icon', c.iconClass]" alt="" />
          <span>{{ c.nameKey ? t(c.nameKey) : c.name }}</span>
        </span>
      </n-button>
    </div>
  </n-modal>
</template>

<style scoped>
.hint { margin: 0 0 12px; color: #666; font-size: 14px; }
.type-group { margin-bottom: 16px; }
.client-list { display: flex; flex-direction: column; gap: 8px; }
.client-btn { justify-content: flex-start; }
.client-btn__inner { display: inline-flex; align-items: center; gap: 10px; }
.client-icon { width: 24px; height: 24px; object-fit: contain; flex-shrink: 0; }
</style>
