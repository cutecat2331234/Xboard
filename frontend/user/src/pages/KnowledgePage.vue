<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DOMPurify from 'dompurify'
import { NButton, NCard, NCollapse, NCollapseItem, NEmpty, NInput, NSpin, NTabs, NTabPane, useMessage } from 'naive-ui'
import { fetchKnowledge, fetchKnowledgeCategories, type KnowledgeItem } from '@/api/knowledge'
import { useI18n } from '@/i18n'
import { resolveApiError } from '@/lib/api-errors'

const ALL_CATEGORY = '__all__'

/** Common admin knowledge category labels → i18n keys (fallback to API string). */
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  通用: 'knowledge.catGeneral',
  教程: 'knowledge.catTutorial',
  使用教程: 'knowledge.catTutorial',
  常见问题: 'knowledge.catFaq',
  FAQ: 'knowledge.catFaq',
  公告: 'knowledge.catNotice',
}

function sanitizeHtml(html: string | undefined | null): string {
  return DOMPurify.sanitize(html ?? '')
}

const items = ref<KnowledgeItem[]>([])
const categories = ref<string[]>([])
const activeCategory = ref(ALL_CATEGORY)
const keyword = ref('')
const query = ref('')
const loading = ref(true)
const { t, locale } = useI18n()
const msg = useMessage()

const filtered = computed(() => {
  let list = items.value
  if (activeCategory.value && activeCategory.value !== ALL_CATEGORY) {
    list = list.filter((k) => k.category === activeCategory.value)
  }
  const q = query.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    (k) => k.title.toLowerCase().includes(q) || (k.body ?? '').toLowerCase().includes(q),
  )
})

function categoryTabLabel(name: string) {
  if (name === ALL_CATEGORY) return t('knowledge.allCategory')
  const key = CATEGORY_LABEL_KEYS[name]
  return key ? t(key) : name
}

function search() {
  query.value = keyword.value
}

onMounted(async () => {
  loading.value = true
  try {
    const lang = locale.value.startsWith('zh') ? 'zh-CN' : locale.value.startsWith('ru') ? 'ru-RU' : 'en-US'
    const [list, cats] = await Promise.all([
      fetchKnowledge(lang),
      fetchKnowledgeCategories(lang).catch(() => []),
    ])
    items.value = list
    categories.value = cats.length ? cats : [...new Set(list.map((k) => k.category).filter(Boolean))]
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t, t('errors.requestFailed')))
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <n-card>
    <n-spin :show="loading">
    <div class="knowledge-search">
      <n-input v-model:value="keyword" :placeholder="t('knowledge.searchPh')" @keyup.enter="search" />
      <n-button @click="search">{{ t('common.search') }}</n-button>
    </div>
    <n-tabs v-if="categories.length > 1" v-model:value="activeCategory" type="line" class="cat-tabs">
      <n-tab-pane :name="ALL_CATEGORY" :tab="categoryTabLabel(ALL_CATEGORY)" />
      <n-tab-pane v-for="c in categories" :key="c" :name="c" :tab="categoryTabLabel(c)" />
    </n-tabs>
    <n-collapse v-if="filtered.length">
      <n-collapse-item v-for="k in filtered" :key="k.id" :title="k.title" :name="String(k.id)">
        <div v-html="sanitizeHtml(k.body)" />
      </n-collapse-item>
    </n-collapse>
    <n-empty v-else :description="t('knowledge.empty')" />
    </n-spin>
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
