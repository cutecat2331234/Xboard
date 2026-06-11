export const ORDER_STATUS: Record<number, string> = {
  0: '待支付',
  1: '开通中',
  2: '已取消',
  3: '已完成',
  4: '已折抵',
}

export function orderStatusLabel(status: number): string {
  return ORDER_STATUS[status] ?? String(status)
}
