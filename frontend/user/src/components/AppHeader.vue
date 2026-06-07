<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NDropdown, NSpace, NText } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()

const settings = computed(() => settingsStore.settings)
const logoUrl = computed(() => settings.value.logo?.trim() || '')

const userMenuOptions = [
  { label: '个人中心', key: 'profile' },
  { type: 'divider', key: 'd1' },
  { label: '退出登录', key: 'logout' },
]

function handleUserMenu(key: string) {
  if (key === 'profile') {
    router.push({ name: 'profile' })
    return
  }
  if (key === 'logout') {
    authStore.logout()
    router.push({ name: 'login' })
  }
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__brand" @click="router.push({ name: 'dashboard' })">
      <img v-if="logoUrl" :src="logoUrl" alt="logo" class="app-header__logo" />
      <NText strong class="app-header__title">{{ settings.title }}</NText>
    </div>

    <NSpace align="center" :size="12">
      <NDropdown :options="userMenuOptions" @select="handleUserMenu">
        <NButton quaternary>
          {{ authStore.user?.email || '用户' }}
        </NButton>
      </NDropdown>
    </NSpace>
  </header>
</template>

<style scoped>
.app-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--n-border-color, #e0e0e6);
  background: var(--n-color, #fff);
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.app-header__logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.app-header__title {
  font-size: 16px;
}
</style>
