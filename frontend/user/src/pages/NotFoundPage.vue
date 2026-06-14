<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NButton, NCard, NEmpty } from 'naive-ui'
import { useI18n } from '@/i18n'

const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <n-card class="rounded-md">
    <n-empty :description="t('errors.pageNotFound')">
      <template #extra>
        <n-button type="primary" @click="router.push('/dashboard')">
          {{ t('nav.dashboard') }}
        </n-button>
      </template>
    </n-empty>
  </n-card>
</template>
