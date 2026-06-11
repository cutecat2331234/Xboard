<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { NCard, NButton, NInput, NScrollbar, useMessage } from 'naive-ui'
import { fetchTicketById, replyTicket, closeTicket, type TicketItem } from '@/api/ticket'
import { useI18n } from '@/i18n'

const route = useRoute()
const msg = useMessage()
const { t } = useI18n()

const ticket = ref<TicketItem | null>(null)
const replyText = ref('')
const sending = ref(false)
const scrollRef = ref<InstanceType<typeof NScrollbar> | null>(null)
const scrollContentRef = ref<HTMLElement | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null

function formatTime(ts?: number) {
  if (!ts) return ''
  return new Date(ts * 1000).toLocaleString('zh-CN')
}

async function load() {
  const id = Number(route.params.id)
  ticket.value = await fetchTicketById(id)
  requestAnimationFrame(() => {
    const el = scrollContentRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

async function sendReply() {
  if (!ticket.value || !replyText.value.trim()) return
  sending.value = true
  try {
    await replyTicket({ id: ticket.value.id, message: replyText.value.trim() })
    replyText.value = ''
    msg.success(t('common.success'))
    await load()
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : t('common.error'))
  } finally {
    sending.value = false
  }
}

async function close() {
  if (!ticket.value) return
  try {
    await closeTicket(ticket.value.id)
    msg.success(t('common.success'))
    await load()
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : t('common.error'))
  }
}

function startPoll() {
  stopPoll()
  pollTimer = setInterval(() => {
    load().catch(() => {})
  }, 2000)
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(async () => {
  try {
    await load()
    startPoll()
  } catch (e: unknown) {
    msg.error(e instanceof Error ? e.message : t('common.error'))
  }
})
onUnmounted(stopPoll)
</script>

<template>
  <n-card v-if="ticket" :title="ticket.subject" class="ticket-detail-card rounded-md">
    <template v-if="ticket.status === 0" #header-extra>
      <n-button size="small" @click="close">{{ t('ticket.close') }}</n-button>
    </template>
    <div class="ticket-scroll-wrap">
      <n-scrollbar ref="scrollRef" class="ticket-scroll">
        <div ref="scrollContentRef" class="ticket-messages">
          <div
            v-for="m in ticket.message ?? []"
            :key="m.id"
            :class="m.is_me ? 'text-right' : 'text-left'"
          >
            <div class="message-time">{{ formatTime(m.created_at) }}</div>
            <div class="message-bubble">{{ m.message }}</div>
          </div>
        </div>
      </n-scrollbar>
    </div>
    <div class="reply-group mt-8">
      <n-input
        v-model:value="replyText"
        type="text"
        size="large"
        :placeholder="t('ticket.replyPh')"
        @keyup.enter="sendReply"
      />
      <n-button type="primary" size="large" round :loading="sending" @click="sendReply">
        {{ t('ticket.reply') }}
      </n-button>
    </div>
  </n-card>
</template>

<style scoped>
.ticket-detail-card {
  height: 100%;
  overflow: hidden;
}
.ticket-scroll-wrap {
  position: relative;
  height: calc(100% - 70px);
}
.ticket-scroll {
  position: absolute;
  right: 0;
  height: 100%;
  width: 100%;
}
.ticket-messages {
  padding-right: 4px;
}
.message-time {
  margin: 8px 0;
  font-size: 14px;
  color: #6b7280;
}
.message-bubble {
  display: inline-block;
  margin-bottom: 8px;
  border-radius: 6px;
  background: #f9fafb;
  padding: 8px 16px 32px;
  font-size: 14px;
  text-align: left;
}
.text-right .message-bubble {
  text-align: right;
}
.reply-group {
  display: flex;
  gap: 8px;
  align-items: center;
}
.reply-group :deep(.n-input) {
  flex: 1;
}
.mt-8 {
  margin-top: 32px;
}
</style>
