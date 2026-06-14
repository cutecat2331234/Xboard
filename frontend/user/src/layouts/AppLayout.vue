<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { HEADER_ICON_PATHS, MENU_ICON_PATHS, renderCarbonIcon } from '@/utils/carbon-icon'
import {
  NAvatar,
  NBreadcrumb,
  NBreadcrumbItem,
  NButton,
  NDrawer,
  NDrawerContent,
  NDropdown,
  NIcon,
  NLayout,
  NLayoutContent,
  NLayoutSider,
  NMenu,
  useDialog,
} from 'naive-ui'
import type { DropdownOption, MenuOption } from 'naive-ui'
import { getSettings } from '@/utils/settings'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/i18n'
import { toggleColorScheme } from '@/lib/theme'
import { LANG_LABELS } from '@/lib/lang-labels'
import { useUserCommConfig } from '@/composables/useUserCommConfig'

const s = getSettings()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const dialog = useDialog()
const { t, locale, setLocale } = useI18n()
const { config: commConfig, load: loadCommConfig } = useUserCommConfig()

const isDark = ref(document.documentElement.classList.contains('dark'))

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

const menuOptions = computed<MenuOption[]>(() => {
  const billingChildren: MenuOption[] = [
    { label: t('nav.order'), key: '/order', icon: renderIcon(MENU_ICON_PATHS.order) },
  ]
  if (commConfig.value?.invite_enable !== 0) {
    billingChildren.push({ label: t('nav.invite'), key: '/invite', icon: renderIcon(MENU_ICON_PATHS.invite) })
  }
  if (commConfig.value?.gift_card_enable !== 0) {
    billingChildren.push({ label: t('nav.giftCard'), key: '/gift-card', icon: renderIcon(MENU_ICON_PATHS.giftCard) })
  }
  return [
  { label: t('nav.dashboard'), key: '/dashboard', icon: renderIcon(MENU_ICON_PATHS.dashboard) },
  { label: t('nav.knowledge'), key: '/knowledge', icon: renderIcon(MENU_ICON_PATHS.knowledge) },
  {
    type: 'group',
    label: () => t('nav.groupBilling'),
    key: 'g-billing',
    children: billingChildren,
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
]
})

const collapsed = ref(false)
const mobileDrawerOpen = ref(false)
const isMobile = ref(false)

const NAV_PATH_KEYS: Record<string, string> = {
  '/dashboard': 'nav.dashboard',
  '/knowledge': 'nav.knowledge',
  '/order': 'nav.order',
  '/invite': 'nav.invite',
  '/gift-card': 'nav.giftCard',
  '/plan': 'nav.plan',
  '/node': 'nav.node',
  '/profile': 'nav.profile',
  '/ticket': 'nav.ticket',
  '/traffic': 'nav.traffic',
}

function labelForPath(path: string) {
  const key = NAV_PATH_KEYS[path]
  return key ? t(key) : t('nav.dashboard')
}

function resolveMenuKey(path: string) {
  if (path.startsWith('/plan/')) return '/plan'
  if (path.startsWith('/order/')) return '/order'
  if (path.startsWith('/ticket/')) return '/ticket'
  return path
}

const menuActiveKey = computed(() => {
  const menuKey = route.meta.menuKey as string | undefined
  return menuKey ?? resolveMenuKey(route.path)
})

const menuValue = ref(menuActiveKey.value)
watch(menuActiveKey, (key) => {
  menuValue.value = key
})

let removeMenuRouterGuard: (() => void) | undefined

function syncMenuValueFromRoute(path: string, menuKey?: string) {
  menuValue.value = menuKey ?? resolveMenuKey(path)
}

const mobileQuery = window.matchMedia('(max-width: 767px)')

function updateMobile() {
  isMobile.value = mobileQuery.matches
  if (!isMobile.value) mobileDrawerOpen.value = false
}

let themeObserver: MutationObserver | undefined

onMounted(() => {
  void loadCommConfig()
  updateMobile()
  mobileQuery.addEventListener('change', updateMobile)
  themeObserver = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  removeMenuRouterGuard = router.beforeEach((to) => {
    if (typeof to.path === 'string' && to.path.startsWith('/')) {
      syncMenuValueFromRoute(to.path, to.meta.menuKey as string | undefined)
    }
  })
})

onUnmounted(() => {
  mobileQuery.removeEventListener('change', updateMobile)
  themeObserver?.disconnect()
  removeMenuRouterGuard?.()
  removeMenuRouterGuard = undefined
})

type BreadcrumbItem = { label: string; to?: string }

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  const menuKey = route.meta.menuKey as string | undefined
  const titleKey = route.meta.titleKey as string | undefined

  if (menuKey && titleKey) {
    return [
      { label: labelForPath(menuKey), to: menuKey },
      { label: t(titleKey) },
    ]
  }

  if (titleKey) return [{ label: t(titleKey) }]
  return [{ label: labelForPath(route.path) }]
})

const themeAriaLabel = computed(() =>
  isDark.value ? t('common.switchToLight') : t('common.switchToDark'),
)

function onMenuSelect(key: string) {
  if (!key.startsWith('/')) return
  menuValue.value = key
  router.push(key)
  if (isMobile.value) mobileDrawerOpen.value = false
}

function onMenuToggle() {
  if (isMobile.value) mobileDrawerOpen.value = !mobileDrawerOpen.value
  else collapsed.value = !collapsed.value
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
  else document.exitFullscreen?.()
}

function logout() {
  dialog.warning({
    title: t('common.logout'),
    content: t('common.logoutConfirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      await auth.logout()
      router.push('/login')
    },
  })
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
    <n-layout-sider
      v-if="!isMobile"
      bordered
      :width="220"
      :collapsed="collapsed"
      :collapsed-width="64"
      collapse-mode="width"
      class="app-sider"
    >
      <div class="app-brand">
        <img v-if="s.logo" :src="s.logo" alt="" class="app-brand__logo" />
        <h2 v-show="!collapsed" class="app-brand__title">{{ s.title || 'Xboard' }}</h2>
      </div>
      <n-menu
        :value="menuValue"
        :collapsed="collapsed"
        :collapsed-width="64"
        :options="menuOptions"
        :indent="18"
        :root-indent="18"
        @update:value="onMenuSelect"
      />
    </n-layout-sider>

    <n-drawer
      v-model:show="mobileDrawerOpen"
      placement="left"
      :width="260"
      :trap-focus="false"
      :block-scroll="true"
      class="app-mobile-drawer"
    >
      <n-drawer-content :native-scrollbar="false" body-content-style="padding: 0">
        <div class="app-brand">
          <img v-if="s.logo" :src="s.logo" alt="" class="app-brand__logo" />
          <h2 class="app-brand__title">{{ s.title || 'Xboard' }}</h2>
        </div>
        <n-menu
          :value="menuValue"
          :options="menuOptions"
          :indent="18"
          :root-indent="18"
          @update:value="onMenuSelect"
        />
      </n-drawer-content>
    </n-drawer>

    <n-layout class="app-layout-inner">
      <header class="app-header flex items-center px-4">
        <div class="app-header-left">
          <n-icon :size="20" class="app-menu-icon" @click="onMenuToggle"><MenuToggleIcon /></n-icon>
          <n-breadcrumb style="--n-item-border-radius: 3px">
            <n-breadcrumb-item
              v-for="(item, index) in breadcrumbItems"
              :key="index"
              :clickable="Boolean(item.to)"
              @click="item.to && router.push(item.to)"
            >
              <n-icon v-if="index === 0" :size="18" class="app-crumb-home"><HomeIcon /></n-icon>
              <span class="app-crumb-text">{{ item.label }}</span>
            </n-breadcrumb-item>
          </n-breadcrumb>
        </div>
        <div class="app-header-actions">
          <n-icon
            :size="18"
            class="mr-5 cursor-pointer"
            role="button"
            :aria-label="themeAriaLabel"
            @click="toggleColorScheme"
          >
            <ThemeIcon />
          </n-icon>
          <n-dropdown :options="langOptions" trigger="click" @select="onLangSelect">
            <n-button quaternary class="app-lang-btn mr-5" :aria-label="t('common.selectLanguage')">
              <template #icon><n-icon :size="18"><LangIcon /></n-icon></template>
            </n-button>
          </n-dropdown>
          <n-icon
            :size="18"
            class="mr-5 cursor-pointer app-header-icon"
            role="button"
            :aria-label="t('common.toggleFullscreen')"
            @click="toggleFullscreen"
          >
            <ExpandIcon />
          </n-icon>
          <n-button quaternary class="app-user-btn" @click="logout">
            <n-avatar round :size="28" :src="auth.user?.avatar_url" />
            <span class="app-user__email">{{ auth.user?.email }}</span>
          </n-button>
        </div>
      </header>
      <n-layout-content class="app-main-outer" :content-style="{ padding: 0, background: 'var(--xb-page-bg)' }">
        <section class="cus-scroll-y app-scroll-main shell-main">
          <router-view />
        </section>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  min-height: 100dvh;
  height: 100vh;
  height: 100dvh;
}
.app-layout-inner {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.app-sider { background: var(--xb-surface); }
.app-sider :deep(.n-menu-item-content--selected::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--xb-primary);
}
.app-sider :deep(.n-menu-item-content) { position: relative; transition: none !important; }
.app-sider :deep(.n-menu-item-content::before),
.app-sider :deep(.n-menu-item-content--selected::before) {
  transition: none !important;
}
.app-sider :deep(.n-menu .n-menu-item-content-header),
.app-sider :deep(.n-menu .n-menu-item-content__icon) {
  transition: none !important;
}
.app-sider :deep(.n-menu-item-group-title) {
  font-size: 13.02px;
  text-transform: none;
  color: var(--xb-text-muted);
  letter-spacing: normal;
}
.app-mobile-drawer :deep(.n-menu-item-content--selected::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--xb-primary);
}
.app-mobile-drawer :deep(.n-menu-item-content) { position: relative; transition: none !important; }
.app-mobile-drawer :deep(.n-menu-item-group-title) {
  font-size: 13.02px;
  text-transform: none;
  color: var(--xb-text-muted);
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
  color: var(--xb-primary);
  line-height: 1.5;
}
.app-header {
  height: 60px;
  justify-content: space-between;
  background: var(--xb-surface);
  border-bottom: 1px solid var(--xb-border);
}
.app-header-left {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0;
  min-width: 0;
}
.app-menu-icon { cursor: pointer; color: var(--xb-icon); margin-right: 8px; }
.app-crumb-home { vertical-align: -3px; }
.app-crumb-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-header-actions {
  display: flex;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}
.mr-5 { margin-right: 20px; }
.cursor-pointer { cursor: pointer; color: var(--xb-text); }
.app-header-icon { color: var(--xb-text); }
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
  max-width: 180px;
  height: 32px;
  justify-content: flex-start;
  padding: 0 8px;
}
.app-user-btn :deep(.n-button__content) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.app-user__email {
  font-size: 13px;
  line-height: 20.8px;
  color: var(--xb-text);
  max-width: 128px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-main-outer {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.app-main-outer :deep(.n-layout-scroll-container) {
  padding: 0 !important;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.app-scroll-main {
  flex: 1;
  min-height: 0;
  width: 100%;
  background: var(--xb-page-bg);
  padding: 4px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
}
@media (min-width: 768px) {
  .app-scroll-main {
    padding: 16px;
  }
}
@media (max-width: 767px) {
  .app-user__email { display: none; }
  .app-user-btn { max-width: none; width: auto; }
  .mr-5 { margin-right: 12px; }
}
.flex { display: flex; }
.items-center { align-items: center; }
.px-4 { padding-left: 16px; padding-right: 16px; }
@media (max-width: 767px) {
  .app-header {
    padding-top: var(--xb-safe-area-inset-top);
    padding-left: calc(16px + var(--xb-safe-area-inset-left));
    padding-right: calc(16px + var(--xb-safe-area-inset-right));
    height: calc(60px + var(--xb-safe-area-inset-top));
  }
  .app-scroll-main {
    padding-bottom: calc(4px + var(--xb-safe-area-inset-bottom));
    padding-left: calc(4px + var(--xb-safe-area-inset-left));
    padding-right: calc(4px + var(--xb-safe-area-inset-right));
  }
  .app-mobile-drawer :deep(.n-drawer-body-content-wrapper) {
    padding-top: var(--xb-safe-area-inset-top);
    padding-bottom: var(--xb-safe-area-inset-bottom);
    padding-left: var(--xb-safe-area-inset-left);
  }
}
</style>
