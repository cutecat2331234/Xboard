import { api } from '@/api'

export function recordPageView() {
  api.post('/passport/comm/pv', {}).catch(() => {})
}
