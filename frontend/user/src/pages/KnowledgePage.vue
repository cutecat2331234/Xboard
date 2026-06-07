<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NCard, NCollapse, NCollapseItem } from 'naive-ui'
import { fetchKnowledge, type KnowledgeItem } from '@/api/knowledge'
import { useI18n } from '@/i18n'

const items = ref<KnowledgeItem[]>([])
const { t } = useI18n()

onMounted(async () => {
  items.value = await fetchKnowledge()
})
</script>

<template>
  <h2 class="page-title">{{ t('nav.knowledge') }}</h2>
  <n-card>
    <n-collapse v-if="items.length">
      <n-collapse-item v-for="k in items" :key="k.id" :title="k.title" :name="String(k.id)">
        <div v-html="k.body" />
      </n-collapse-item>
    </n-collapse>
    <p v-else style="color:#888;margin:0">—</p>
  </n-card>
</template>
