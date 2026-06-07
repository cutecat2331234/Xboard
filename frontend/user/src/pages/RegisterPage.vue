<script setup lang="ts">
import { computed } from 'vue'
import { NCard, NButton, NText } from 'naive-ui'
import { useRouter } from 'vue-router'
import { getSettings } from '../utils/settings'

const router = useRouter()
const settings = computed(() => getSettings())
</script>

<template>
  <div class="auth-page">
    <n-card class="auth-card" :bordered="true">
      <div class="auth-card__header">
        <n-text strong class="auth-card__title">{{ settings.title || 'Xboard' }}</n-text>
        <n-text depth="3">Register</n-text>
      </div>
      <p style="margin: 0 0 16px; color: #666">Invite code required (new frontend)</p>
      <n-button type="primary" block @click="router.push('/login')">Back to Login</n-button>
    </n-card>
  </div>
</template>

<style scoped>
.auth-card__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
}
.auth-card__title {
  font-size: 24px;
}
</style>
