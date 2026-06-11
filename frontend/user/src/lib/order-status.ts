export const ORDER_STATUS_KEYS: Record<number, string> = {
  0: 'order.statusPending',
  1: 'order.statusProcessing',
  2: 'order.statusCanceled',
  3: 'order.statusCompleted',
  4: 'order.statusOffset',
}

export function orderStatusLabel(status: number): string {
  return ORDER_STATUS_KEYS[status] ?? String(status)
}
