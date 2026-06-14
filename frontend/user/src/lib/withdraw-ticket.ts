import type { TicketItem } from '@/api/ticket'

const WITHDRAW_SUBJECT_PREFIX = '[withdraw_ticket]'
const WITHDRAW_AMOUNT_PATTERN = /^\[withdraw_amount:\d+\]/

/** Matches backend TicketService::isOfficialWithdrawTicket semantics for user UI. */
export function isWithdrawTicket(row: Pick<TicketItem, 'level' | 'subject' | 'message'>): boolean {
  if (Number(row.level) !== 2) return false
  const subject = row.subject ?? ''
  if (subject.includes(WITHDRAW_SUBJECT_PREFIX)) {
    const first = row.message?.[0]?.message ?? ''
    return WITHDRAW_AMOUNT_PATTERN.test(first.trim())
  }
  const legacyOfficial =
    subject.includes('Commission Withdrawal Request') ||
    subject.includes('Commission withdrawal') ||
    subject.includes('佣金提现')
  if (!legacyOfficial) return false
  const first = row.message?.[0]?.message ?? ''
  return WITHDRAW_AMOUNT_PATTERN.test(first.trim())
}
