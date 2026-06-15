<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  useDialog,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import { fetchTickets, saveTicket, closeTicket, type TicketItem } from '@/api/ticket'
import { formatLocaleDateTime } from '@/lib/format-date'
import { useI18n } from '@/i18n'
import { resolveApiError } from '@/lib/api-errors'
import { isWithdrawTicket } from '@/lib/withdraw-ticket'

const router = useRouter()
const dialog = useDialog()
const rows = ref<TicketItem[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const creating = ref(false)
const showCreate = ref(false)
const subject = ref('')
const message = ref('')
const level = ref(0)
const msg = useMessage()
const { t, locale } = useI18n()

const levelOptions = computed(() => [
  { label: t('ticket.levelLow'), value: 0 },
  { label: t('ticket.levelMedium'), value: 1 },
  { label: t('ticket.levelHigh'), value: 2 },
])

function levelLabel(row: TicketItem) {
  if (isWithdrawTicket(row)) return t('ticket.levelWithdraw')
  return levelOptions.value[row.level]?.label ?? String(row.level)
}

function ticketStatusDotClass(row: TicketItem) {
  if (row.status === 1) return 'status-dot status-dot--ok'
  if (row.reply_status === 1) return 'status-dot status-dot--ok'
  return 'status-dot status-dot--bad'
}

function ticketStatusLabel(row: TicketItem) {
  if (row.status === 1) return t('ticket.closed')
  if (row.reply_status === 1) return t('ticket.replied')
  return t('ticket.pendingReply')
}

async function load() {
  loading.value = true
  try {
    const res = await fetchTickets(page.value, pageSize.value)
    rows.value = res.data ?? []
    total.value = res.total ?? 0
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t, t('errors.requestFailed')))
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
  void load()
}

function onPageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  void load()
}

async function create() {
  if (!subject.value.trim() || !message.value.trim()) {
    msg.warning(t('ticket.fillRequired'))
    return
  }
  creating.value = true
  try {
    const created = await saveTicket({ subject: subject.value.trim(), level: level.value, message: message.value.trim() })
    showCreate.value = false
    subject.value = ''
    message.value = ''
    msg.success(t('common.success'))
    if (created?.id) {
      router.push(`/ticket/${created.id}`)
    }
  } catch (e: unknown) {
    msg.error(resolveApiError(e, t))
  } finally {
    creating.value = false
  }
}

async function close(row: TicketItem) {
  dialog.warning({
    title: t('ticket.close'),
    content: t('ticket.closeConfirm'),
    positiveText: t('common.confirm'),
    negativeText: t('common.cancel'),
    onPositiveClick: async () => {
      try {
        await closeTicket(row.id)
        msg.success(t('ticket.closeSuccess'))
        await load()
      } catch (e: unknown) {
        msg.error(resolveApiError(e, t))
      }
    },
  })
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
    render: (r) => levelLabel(r),
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
    render: (r) => formatLocaleDateTime(r.created_at, locale.value),
  },
  {
    title: t('ticket.lastReply'),
    key: 'updated_at',
    render: (r) => formatLocaleDateTime(r.updated_at, locale.value),
  },
  {
    title: t('common.actions'),
    key: 'actions',
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'order-actions' }, [
        renderTextAction(t('ticket.view'), () => router.push(`/ticket/${row.id}`)),
        h('span', { class: 'order-actions-divider' }),
        renderTextAction(t('ticket.close'), () => close(row), row.status === 1 || isWithdrawTicket(row)),
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
    <n-empty v-if="!loading && rows.length === 0" :description="t('ticket.empty')" />
    <n-data-table
      v-else
      remote
      :columns="columns"
      :data="rows"
      :loading="loading"
      :scroll-x="800"
      :pagination="{
        page,
        pageSize,
        itemCount: total,
        showSizePicker: true,
        pageSizes: [10, 20, 50],
        onUpdatePage: onPageChange,
        onUpdatePageSize: onPageSizeChange,
      }"
    />
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
        <n-button type="primary" :loading="creating" @click="create">{{ t('common.confirm') }}</n-button>
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
