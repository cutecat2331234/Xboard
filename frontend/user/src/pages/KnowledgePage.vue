<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NButton, NCard, NCollapse, NCollapseItem, NInput, NTabs, NTabPane } from 'naive-ui'
import { fetchKnowledge, fetchKnowledgeCategories, type KnowledgeItem } from '@/api/knowledge'
import { useI18n } from '@/i18n'

const items = ref<KnowledgeItem[]>([])
const categories = ref<string[]>([])
const activeCategory = ref('')
const keyword = ref('')
const query = ref('')
const { t } = useI18n()

const filtered = computed(() => {
  let list = items.value
  if (activeCategory.value) list = list.filter((k) => k.category === activeCategory.value)
  const q = query.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    (k) => k.title.toLowerCase().includes(q) || (k.body ?? '').toLowerCase().includes(q),
  )
})

function search() {
  query.value = keyword.value
}

onMounted(async () => {
  const [list, cats] = await Promise.all([fetchKnowledge(), fetchKnowledgeCategories().catch(() => [])])
  items.value = list
  categories.value = cats.length ? cats : [...new Set(list.map((k) => k.category).filter(Boolean))]
  if (categories.value.length) activeCategory.value = categories.value[0]
})
</script>

<template>
  <h2 class="page-title">{{ t('nav.knowledge') }}</h2>
  <n-card>
    <div class="knowledge-search">
      <n-input v-model:value="keyword" :placeholder="t('nav.knowledge')" @keyup.enter="search" />
      <n-button @click="search">{{ t('common.search') }}</n-button>
    </div>
    <n-tabs v-if="categories.length > 1" v-model:value="activeCategory" type="line" class="cat-tabs">
      <n-tab-pane v-for="c in categories" :key="c" :name="c" :tab="c" />
    </n-tabs>
    <n-collapse v-if="filtered.length">
      <n-collapse-item v-for="k in filtered" :key="k.id" :title="k.title" :name="String(k.id)">
        <div v-html="k.body" />
      </n-collapse-item>
    </n-collapse>
    <p v-else style="color:#888;margin:0">—</p>
  </n-card>
</template>

<style scoped>
.knowledge-search {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.knowledge-search .n-input {
  flex: 1;
}
.cat-tabs { margin-bottom: 12px; }
</style>
