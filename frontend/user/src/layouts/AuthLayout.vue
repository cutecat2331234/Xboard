<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NText } from 'naive-ui'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
const settings = computed(() => settingsStore.settings)

const backgroundStyle = computed(() => {
  const url = settings.value.background_url?.trim()
  if (!url) {
    return {}
  }
  return {
    backgroundImage: `url(${url})`,
  }
})
</script>

<template>
  <div class="auth-page" :style="backgroundStyle">
    <NCard class="auth-card" :bordered="true">
      <div class="auth-card__header">
        <img
          v-if="settings.logo"
          :src="settings.logo"
          alt="logo"
          class="auth-card__logo"
        />
        <NText strong class="auth-card__title">{{ settings.title }}</NText>
        <NText depth="3" class="auth-card__desc">{{ settings.description }}</NText>
      </div>
      <RouterView />
    </NCard>
  </div>
</template>

<style scoped>
.auth-card__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.auth-card__logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.auth-card__title {
  font-size: 24px;
}

.auth-card__desc {
  font-size: 14px;
}
</style>
