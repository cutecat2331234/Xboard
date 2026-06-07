<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NDropdown } from 'naive-ui'
import { getSettings } from '@/utils/settings'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/i18n'

const s = getSettings()
const auth = useAuthStore()
const router = useRouter()
const { t, locale, setLocale } = useI18n()

const nav = [
  { to: '/dashboard', label: 'nav.dashboard' },
  { to: '/plan', label: 'nav.plan' },
  { to: '/order', label: 'nav.order' },
  { to: '/invite', label: 'nav.invite' },
  { to: '/traffic', label: 'nav.traffic' },
  { to: '/knowledge', label: 'nav.knowledge' },
  { to: '/ticket', label: 'nav.ticket' },
  { to: '/profile', label: 'nav.profile' },
]

const langOptions = (s.i18n ?? ['en-US', 'zh-CN']).map((code) => ({
  label: code,
  key: code,
}))

function onLangSelect(key: string) {
  setLocale(key)
}

function logout() {
  auth.logout()
  router.push('/login')
}

onMounted(() => auth.loadUser())
</script>

<template>
  <div>
    <header class="shell-header">
      <img v-if="s.logo" :src="s.logo" alt="logo" style="height:32px;margin-right:8px" />
      <strong>{{ s.title || 'XBoard' }}</strong>
      <div style="margin-left:auto;display:flex;align-items:center;gap:12px">
        <n-dropdown :options="langOptions" @select="onLangSelect">
          <n-button size="small" quaternary>{{ locale }}</n-button>
        </n-dropdown>
        <n-button size="small" @click="logout">{{ t('common.logout') }}</n-button>
      </div>
    </header>
    <div class="shell">
      <nav class="shell-side">
        <router-link v-for="item in nav" :key="item.to" :to="item.to">
          {{ t(item.label) }}
        </router-link>
      </nav>
      <main class="shell-main"><router-view /></main>
    </div>
  </div>
</template>
