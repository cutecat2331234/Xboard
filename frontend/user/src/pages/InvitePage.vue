<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NCard, NButton, NDataTable, useMessage } from 'naive-ui'
import { fetchInvite, generateInviteCode } from '@/api/invite'
import { useI18n } from '@/i18n'

const codes = ref<{ code: string; pv: number; status: number }[]>([])
const stat = ref<number[]>([0, 0, 0])
const msg = useMessage()
const { t } = useI18n()

async function load() {
  const data = await fetchInvite()
  codes.value = data.codes ?? []
  stat.value = data.stat ?? [0, 0, 0]
}

async function generate() {
  try {
    await generateInviteCode()
    msg.success('OK')
    await load()
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : 'Failed')
  }
}

onMounted(load)
</script>

<template>
  <h2 class="page-title">{{ t('nav.invite') }}</h2>
  <n-card title="Stats" style="margin-bottom:16px">
    <p style="margin:0">Registered: {{ stat[0] }} · Commission: ¥{{ (stat[1] / 100).toFixed(2) }}</p>
  </n-card>
  <n-card>
    <n-button type="primary" style="margin-bottom:12px" @click="generate">Generate Code</n-button>
    <n-data-table
      :columns="[
        { title: 'Code', key: 'code' },
        { title: 'PV', key: 'pv' },
        { title: 'Status', key: 'status' },
      ]"
      :data="codes"
    />
  </n-card>
</template>
