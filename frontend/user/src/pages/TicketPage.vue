<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { NCard, NDataTable, NButton, NModal, NForm, NFormItem, NInput, NSelect, useMessage } from 'naive-ui'
import { fetchTickets, saveTicket, closeTicket } from '@/api/ticket'
import { useI18n } from '@/i18n'

const rows = ref<Awaited<ReturnType<typeof fetchTickets>>>([])
const showCreate = ref(false)
const subject = ref('')
const message = ref('')
const level = ref(0)
const msg = useMessage()
const { t } = useI18n()

async function load() {
  rows.value = await fetchTickets()
}

async function create() {
  try {
    await saveTicket({ subject: subject.value, level: level.value, message: message.value })
    showCreate.value = false
    msg.success('Created')
    await load()
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : 'Failed')
  }
}

async function close(id: number) {
  await closeTicket(id)
  await load()
}

onMounted(load)
</script>

<template>
  <h2 class="page-title">{{ t('nav.ticket') }}</h2>
  <n-button type="primary" style="margin-bottom:12px" @click="showCreate = true">New Ticket</n-button>
  <n-card>
    <n-data-table
      :columns="[
        { title: 'ID', key: 'id' },
        { title: 'Subject', key: 'subject' },
        { title: 'Status', key: 'status' },
        { title: 'Actions', key: 'a', render: (r) => h(NButton, { size: 'small', onClick: () => close(r.id) }, () => 'Close') },
      ]"
      :data="rows"
    />
  </n-card>

  <n-modal v-model:show="showCreate" preset="card" title="New Ticket" style="width:480px">
    <n-form>
      <n-form-item label="Subject"><n-input v-model:value="subject" /></n-form-item>
      <n-form-item label="Level">
        <n-select v-model:value="level" :options="[{ label: 'Low', value: 0 }, { label: 'Medium', value: 1 }, { label: 'High', value: 2 }]" />
      </n-form-item>
      <n-form-item label="Message"><n-input v-model:value="message" type="textarea" /></n-form-item>
      <n-button type="primary" @click="create">{{ t('common.submit') }}</n-button>
    </n-form>
  </n-modal>
</template>
