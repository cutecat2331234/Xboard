<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HEADER_ICON_PATHS, MENU_ICON_PATHS, renderCarbonIcon } from '@/utils/carbon-icon'
import {
  NAvatar,
  NBreadcrumb,
  NBreadcrumbItem,
  NButton,
  NDropdown,
  NIcon,
  NLayout,
  NLayoutContent,
  NLayoutSider,
  NMenu,
} from 'naive-ui'
import type { DropdownOption, MenuOption } from 'naive-ui'
import { getSettings } from '@/utils/settings'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/i18n'
import { toggleColorScheme } from '@/lib/theme'
import { LANG_LABELS } from '@/lib/lang-labels'

const s = getSettings()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { t, locale, setLocale } = useI18n()

const langOptions = computed<DropdownOption[]>(() => {
  const langs = getSettings().i18n ?? ['zh-CN', 'en-US']
  return langs.map((code) => ({
    key: code,
    label: LANG_LABELS[code] ?? code,
  }))
})

function onLangSelect(key: string) {
  setLocale(key)
}

function renderIcon(path: string) {
  return () => h(NIcon, { size: 18 }, { default: renderCarbonIcon(path) })
}

const HomeIcon = renderCarbonIcon(MENU_ICON_PATHS.dashboard, '0 0 24 24', 'inline')
const ThemeIcon = renderCarbonIcon(HEADER_ICON_PATHS.theme, '0 0 24 24', 'inline')
const LangIcon = renderCarbonIcon(HEADER_ICON_PATHS.language, '0 0 24 24', 'inline')
const ExpandIcon = renderCarbonIcon(HEADER_ICON_PATHS.expand, '0 0 1024 1024', 'inline')

const menuOptions = computed<MenuOption[]>(() => [
  { label: t('nav.dashboard'), key: '/dashboard', icon: renderIcon(MENU_ICON_PATHS.dashboard) },
  { label: t('nav.knowledge'), key: '/knowledge', icon: renderIcon(MENU_ICON_PATHS.knowledge) },
  {
    type: 'group',
    label: () => t('nav.groupBilling'),
    key: 'g-billing',
    children: [
      { label: t('nav.order'), key: '/order', icon: renderIcon(MENU_ICON_PATHS.order) },
      { label: t('nav.invite'), key: '/invite', icon: renderIcon(MENU_ICON_PATHS.invite) },
    ],
  },
  {
    type: 'group',
    label: () => t('nav.groupSubscription'),
    key: 'g-sub',
    children: [
      { label: t('nav.plan'), key: '/plan', icon: renderIcon(MENU_ICON_PATHS.plan) },
      { label: t('nav.node'), key: '/node', icon: renderIcon(MENU_ICON_PATHS.node) },
    ],
  },
  {
    type: 'group',
    label: () => t('nav.groupAccount'),
    key: 'g-account',
    children: [
      { label: t('nav.profile'), key: '/profile', icon: renderIcon(MENU_ICON_PATHS.profile) },
      { label: t('nav.ticket'), key: '/ticket', icon: renderIcon(MENU_ICON_PATHS.ticket) },
      { label: t('nav.traffic'), key: '/traffic', icon: renderIcon(MENU_ICON_PATHS.traffic) },
    ],
  },
])

const collapsed = ref(false)

function resolveMenuKey(path: string) {
  if (path.startsWith('/plan/')) return '/plan'
  if (path.startsWith('/order/')) return '/order'
  if (path.startsWith('/ticket/')) return '/ticket'
  return path
}

const menuActiveKey = computed(() => resolveMenuKey(route.path))

const breadcrumb = computed(() => {
  const metaKey = route.meta.titleKey as string | undefined
  if (metaKey) return t(metaKey)
  const map: Record<string, string> = {
    '/dashboard': t('nav.dashboard'),
    '/knowledge': t('nav.knowledge'),
    '/order': t('nav.order'),
    '/invite': t('nav.invite'),
    '/plan': t('nav.plan'),
    '/node': t('nav.node'),
    '/profile': t('nav.profile'),
    '/ticket': t('nav.ticket'),
    '/traffic': t('nav.traffic'),
  }
  return map[route.path] ?? t('nav.dashboard')
})

function onMenuSelect(key: string) {
  if (key.startsWith('/')) router.push(key)
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
  else document.exitFullscreen?.()
}

function logout() {
  auth.logout()
  router.push('/login')
}

const MenuToggleIcon = {
  render() {
    return h('svg', { class: 'inline-block', viewBox: '0 0 24 24', width: '1em', height: '1em' }, [
      h('path', {
        fill: 'currentColor',
        d: 'M11 13h10v-2H11m0-2h10V7H11M3 3v2h18V3M3 21h18v-2H3m0-7l4 4V8m4 9h10v-2H11z',
      }),
    ])
  },
}
</script>

<template>
  <n-layout has-sider class="app-layout">
    <n-layout-sider bordered :width="220" :collapsed="collapsed" :collapsed-width="64" collapse-mode="width" class="app-sider">
      <div class="app-brand">
        <img v-if="s.logo" :src="s.logo" alt="" class="app-brand__logo" />
        <h2 class="app-brand__title">{{ s.title || 'Xboard' }}</h2>
      </div>
      <n-menu
        :value="menuActiveKey"
        :collapsed="collapsed"
        :collapsed-width="64"
        :options="menuOptions"
        :indent="18"
        :root-indent="18"
        @update:value="onMenuSelect"
      />
    </n-layout-sider>
    <n-layout>
      <header class="app-header flex items-center bg-white px-4">
        <div class="app-header-left">
          <n-icon :size="20" class="app-menu-icon" @click="collapsed = !collapsed"><MenuToggleIcon /></n-icon>
          <n-breadcrumb style="--n-item-border-radius: 3px">
            <n-breadcrumb-item>
              <n-icon :size="18" class="app-crumb-home"><HomeIcon /></n-icon>
              {{ breadcrumb }}
            </n-breadcrumb-item>
          </n-breadcrumb>
        </div>
        <div class="app-header-actions">
          <n-icon :size="18" class="mr-5 cursor-pointer" @click="toggleColorScheme">
            <ThemeIcon />
          </n-icon>
          <n-dropdown :options="langOptions" trigger="click" @select="onLangSelect">
            <n-button quaternary class="app-lang-btn mr-5">
              <template #icon><n-icon :size="18"><LangIcon /></n-icon></template>
            </n-button>
          </n-dropdown>
          <n-icon :size="18" class="mr-5 cursor-pointer" @click="toggleFullscreen">
            <ExpandIcon />
          </n-icon>
          <n-button quaternary class="app-user-btn" @click="logout">
            <n-avatar round :size="28" :src="auth.user?.avatar_url" />
            <span class="app-user__email">{{ auth.user?.email }}</span>
          </n-button>
        </div>
      </header>
      <n-layout-content class="app-main-outer" :content-style="{ padding: 0, background: '#f5f6fb' }">
        <section class="cus-scroll-y app-scroll-main shell-main">
          <router-view />
        </section>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style scoped>
.app-layout { min-height: 100vh; height: 100vh; }
.app-sider { background: #fff; }
.app-sider :deep(.n-menu-item-content--selected::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #316c72;
}
.app-sider :deep(.n-menu-item-content) { position: relative; }
.app-sider :deep(.n-menu-item-group-title) {
  font-size: 13.02px;
  text-transform: none;
  color: #767c82;
  letter-spacing: normal;
}
.app-brand {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  gap: 8px;
  padding: 0;
}
.app-brand__logo { height: 28px; }
.app-brand__title {
  margin: 0 8px;
  font-weight: 700;
  font-size: 16px;
  color: #316c72;
  line-height: 1.5;
}
.app-header {
  height: 60px;
  justify-content: space-between;
}
.app-header-left {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0;
  min-width: 0;
}
.app-menu-icon { cursor: pointer; color: #666; }
.app-crumb-home { vertical-align: -3px; }
.app-header-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
}
.mr-5 { margin-right: 20px; }
.cursor-pointer { cursor: pointer; color: rgb(51, 54, 57); }
.app-lang-btn {
  width: 18px;
  height: 18px;
  min-width: 18px;
  padding: 0;
}
.app-lang-btn :deep(.n-button__icon) { margin: 0; }
.app-user-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 180px;
  height: 32px;
  justify-content: flex-start;
  padding: 0 8px;
}
.app-user-btn :deep(.n-button__content) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.app-user__email {
  font-size: 13px;
  line-height: 20.8px;
  color: rgb(51, 54, 57);
  max-width: 128px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-main-outer :deep(.n-layout-scroll-container) {
  padding: 0 !important;
}
.app-scroll-main {
  min-height: calc(100vh - 60px);
  background: #f5f6fb;
  padding: 4px;
  overflow-y: auto;
  box-sizing: border-box;
}
@media (min-width: 768px) {
  .app-scroll-main {
    padding: 16px;
  }
}
.flex { display: flex; }
.items-center { align-items: center; }
.bg-white { background: #fff; }
.px-4 { padding-left: 16px; padding-right: 16px; }
</style>
