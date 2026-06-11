<script setup lang="ts">
import { computed } from 'vue'
import { NCard } from 'naive-ui'
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
      <div class="auth-card__body">
        <div v-if="settings.logo" class="auth-card__header">
          <img :src="settings.logo" alt="logo" class="auth-card__logo" />
        </div>
        <h1 class="auth-card__title-main">{{ settings.title }}</h1>
        <h5 class="auth-card__subtitle">{{ settings.description }}</h5>
        <RouterView />
      </div>
      <div v-if="$slots.footer" class="auth-card__footer-bar">
        <slot name="footer" />
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.auth-card__body {
  padding: 24px;
}
.auth-card__header {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
}
.auth-card__logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
}
.auth-card__title-main {
  margin: 24.12px 0;
  text-align: center;
  font-size: 36px;
  font-weight: 400;
  line-height: 40px;
  color: #343a40;
}
.auth-card__subtitle {
  margin: 23.38px 0 0;
  text-align: center;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: #6c757d;
}
.auth-card__footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgb(250, 250, 252);
  color: #6b7280;
}
</style>
