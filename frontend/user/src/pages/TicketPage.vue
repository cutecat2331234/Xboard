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
import { formatFixedDateTime } from '@/lib/format-date'
import { useI18n } from '@/i18n'
import { resolveApiError } from '@/lib/api-errors'

const router = useRouter()
const rows = ref<TicketItem[]>([])
const loading = ref(false)
const showCreate = ref(false)
const subject = ref('')
const message = ref('')
const level = ref(0)
const msg = useMessage()
const { t } = useI18n()

const levelOptions = computed(() => [
  { label: t('ticket.levelLow'), value: 0 },
  { label: t('ticket.levelMedium'), value: 1 },
  { label: t('ticket.levelHigh'), value: 2 },
])

function levelLabel(value: number) {
  return levelOptions.value[value]?.label ?? String(value)
}

function ticketStatusDotClass(row: TicketItem) {
  if (row.status === 1) return 'status-dot status-dot--ok'
  if (row.reply_status === 0) return 'status-dot status-dot--info'
  return 'status-dot status-dot--bad'
}

function ticketStatusLabel(row: TicketItem) {
  if (row.status === 1) return t('ticket.closed')
  if (row.reply_status === 0) return t('ticket.replied')
  return t('ticket.pendingReply')
}

async function load() {
  loading.value = true
  try {
    rows.value = await fetchTickets()
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t, t('errors.requestFailed')))
  } finally {
    loading.value = false
  }
}

async function create() {
  try {
    await saveTicket({ subject: subject.value, level: level.value, message: message.value })
    showCreate.value = false
    subject.value = ''
    message.value = ''
    msg.success(t('common.success'))
    await load()
    const created = rows.value[0]
    if (created?.id) router.push(`/ticket/${created.id}`)
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

function renderTextAction(label: string, onClick: () => void, disabled = false) {
  return h(
    'button',
    {
      type: 'button',
      class: 'order-link-btn',
      disabled,
      onClick,
    },
    label,
  )
}

const columns = computed<DataTableColumns<TicketItem>>(() => [
  { title: t('ticket.subject'), key: 'subject' },
  {
    title: t('ticket.level'),
    key: 'level',
    render: (r) => levelLabel(r.level),
  },
  {
    title: t('ticket.status'),
    key: 'status',
    render: (r) =>
      h('div', { class: 'flex items-center' }, [
        h('div', { class: ticketStatusDotClass(r) }),
        ticketStatusLabel(r),
      ]),
  },
  {
    title: t('ticket.createdAt'),
    key: 'created_at',
    render: (r) => formatFixedDateTime(r.created_at),
  },
  {
    title: t('ticket.lastReply'),
    key: 'updated_at',
    render: (r) => formatFixedDateTime(r.updated_at),
  },
  {
    title: t('common.actions'),
    key: 'actions',
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'order-actions' }, [
        renderTextAction(t('ticket.view'), () => router.push(`/ticket/${row.id}`)),
        h('span', { class: 'order-actions-divider' }),
        renderTextAction(t('ticket.close'), () => close(row), row.status === 1),
      ]),
  },
])

onMounted(load)
</script>

<template>
  <n-card class="rounded-md" :title="t('ticket.title')">
    <template #header-extra>
      <n-button type="primary" round size="small" @click="showCreate = true">{{ t('ticket.new') }}</n-button>
    </template>
    <n-data-table :columns="columns" :data="rows" :loading="loading" :scroll-x="800" />
  </n-card>

  <n-modal v-model:show="showCreate" preset="card" :title="t('ticket.new')" style="width: 600px">
    <n-form label-placement="top">
      <n-form-item :label="t('ticket.subject')">
        <n-input v-model:value="subject" :placeholder="t('ticket.subjectPh')" />
      </n-form-item>
      <n-form-item :label="t('ticket.level')">
        <n-select v-model:value="level" :options="levelOptions" :placeholder="t('ticket.levelPh')" />
      </n-form-item>
      <n-form-item :label="t('ticket.message')">
        <n-input v-model:value="message" type="textarea" :rows="4" :placeholder="t('ticket.messagePh')" />
      </n-form-item>
      <div class="ticket-modal-actions">
        <n-button @click="showCreate = false">{{ t('common.cancel') }}</n-button>
        <n-button type="primary" @click="create">{{ t('common.confirm') }}</n-button>
      </div>
    </n-form>
  </n-modal>
</template>

<style scoped>
.ticket-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
