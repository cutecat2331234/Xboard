import { api, request } from '@/api'

export async function fetchTelegramBotInfo() {
  return request<{ username: string }>(api.get('/user/telegram/getBotInfo'))
}

export async function unbindTelegram() {
  return request<null>(api.post('/user/telegram/unbind'))
}
