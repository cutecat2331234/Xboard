<script setup lang="ts">
import { computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  BookOutline,
  CardOutline,
  HomeOutline,
  PersonOutline,
  TicketOutline,
} from '@vicons/ionicons5'
import { NIcon, NMenu } from 'naive-ui'
import type { MenuOption } from 'naive-ui'

const route = useRoute()
const router = useRouter()

function renderIcon(icon: unknown) {
  return () => h(NIcon, null, { default: () => h(icon as object) })
}

const menuOptions = computed<MenuOption[]>(() => [
  {
    label: '仪表盘',
    key: 'dashboard',
    icon: renderIcon(HomeOutline),
  },
  {
    label: '订阅',
    key: 'subscribe',
    icon: renderIcon(CardOutline),
  },
  {
    label: '文档',
    key: 'knowledge',
    icon: renderIcon(BookOutline),
  },
  {
    label: '工单',
    key: 'ticket',
    icon: renderIcon(TicketOutline),
  },
  {
    label: '个人中心',
    key: 'profile',
    icon: renderIcon(PersonOutline),
  },
])

const activeKey = computed(() => String(route.name ?? 'dashboard'))

function handleSelect(key: string) {
  router.push({ name: key })
}
</script>

<template>
  <aside class="app-sidebar">
    <NMenu
      :value="activeKey"
      :options="menuOptions"
      :indent="18"
      @update:value="handleSelect"
    />
  </aside>
</template>
