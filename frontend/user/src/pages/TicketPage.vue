<script setup lang="ts">

import { computed, h, onMounted, ref } from 'vue'

import { useRouter } from 'vue-router'

import {

  NButton,

  NCard,

  NDataTable,

  NForm,

  NFormItem,

  NInput,

  NModal,

  NSelect,

  useMessage,

  type DataTableColumns,

} from 'naive-ui'

import { fetchTickets, saveTicket, closeTicket, type TicketItem } from '@/api/ticket'

import { useI18n } from '@/i18n'



const router = useRouter()

const rows = ref<TicketItem[]>([])

const showCreate = ref(false)

const subject = ref('')

const message = ref('')

const level = ref(0)

const msg = useMessage()

const { t } = useI18n()



function formatTime(ts?: number) {

  if (!ts) return '—'

  return new Date(ts * 1000).toLocaleString('zh-CN')

}



async function load() {

  rows.value = await fetchTickets()

}



async function create() {

  try {

    await saveTicket({ subject: subject.value, level: level.value, message: message.value })

    showCreate.value = false

    subject.value = ''

    message.value = ''

    msg.success(t('common.success'))

    await load()

  } catch (e: unknown) {

    msg.error(e instanceof Error ? e.message : t('common.error'))

  }

}



async function close(row: TicketItem) {

  try {

    await closeTicket(row.id)

    msg.success(t('ticket.closeSuccess'))

    await load()

  } catch (e: unknown) {

    msg.error(e instanceof Error ? e.message : t('common.error'))

  }

}



const columns = computed<DataTableColumns<TicketItem>>(() => [

  { title: t('ticket.subject'), key: 'subject' },

  { title: t('ticket.level'), key: 'level' },

  {

    title: t('ticket.status'),

    key: 'status',

    render: (r) => (r.status ? t('ticket.closed') : t('ticket.open')),

  },

  { title: t('ticket.createdAt'), key: 'created_at', render: (r) => formatTime(r.created_at) },

  { title: t('ticket.lastReply'), key: 'updated_at', render: (r) => formatTime(r.updated_at) },

  {

    title: t('common.actions'),

    key: 'actions',

    render: (row) =>

      h('div', { style: 'display:flex;gap:8px' }, [

        h(

          NButton,

          { size: 'small', onClick: () => router.push(`/ticket/${row.id}`) },

          () => t('ticket.view'),

        ),

        !row.status

          ? h(NButton, { size: 'small', quaternary: true, onClick: () => close(row) }, () => t('ticket.close'))

          : null,

      ]),

  },

])



onMounted(load)

</script>



<template>

  <n-card :title="t('ticket.title')">

    <template #header-extra>

      <n-button type="primary" size="small" @click="showCreate = true">{{ t('ticket.new') }}</n-button>

    </template>

    <n-data-table :columns="columns" :data="rows" :bordered="false" />

  </n-card>



  <n-modal v-model:show="showCreate" preset="card" :title="t('ticket.new')" style="width: 480px">

    <n-form label-placement="top">

      <n-form-item :label="t('ticket.subject')"><n-input v-model:value="subject" /></n-form-item>

      <n-form-item :label="t('ticket.level')">

        <n-select

          v-model:value="level"

          :options="[

            { label: t('ticket.levelLow'), value: 0 },

            { label: t('ticket.levelMedium'), value: 1 },

            { label: t('ticket.levelHigh'), value: 2 },

          ]"

        />

      </n-form-item>

      <n-form-item :label="t('ticket.message')"><n-input v-model:value="message" type="textarea" :rows="4" /></n-form-item>

      <n-button type="primary" @click="create">{{ t('common.submit') }}</n-button>

    </n-form>

  </n-modal>

</template>


