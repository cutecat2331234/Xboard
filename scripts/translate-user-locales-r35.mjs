#!/usr/bin/env node
/** R35: zh-TW + ja/ko/vi/fa missing withdraw/order/error keys from en-US. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const localeDir = path.join(root, 'frontend/user/src/i18n/locales')

const PATCHES = {
  'zh-TW.ts': {
    'errors.giftCardRedeemFailed': '兌換失敗，請稍後重試',
    'errors.couponNotStarted': '優惠券尚未開始',
    'errors.couponPerUserLimit': '每人只能使用此優惠券 {limit} 次',
    'giftCard.mysteryPreview': '神秘獎勵（兌換後揭曉）',
    'invite.withdrawLimitHint': '最低提現金額：{limit}',
    'invite.withdrawFeeHint': '提現手續費：{rate}%',
    'invite.withdrawFullBalanceHint': '將提現全部可用佣金（扣除手續費）',
    'invite.withdrawMethodRequired': '請選擇提現方式',
    'invite.withdrawAccountRequired': '請輸入提現帳號',
    'order.processingOrderDesc': '您有訂單正在開通中，請稍候或前往訂單頁查看',
    'order.cancelledDuringPay': '訂單已取消，支付未完成',
    'order.noPaymentMethods': '暫無可用支付方式，請聯繫客服',
    'order.stripeUnavailable': 'Stripe 支付不可用',
    'order.stripeLoadFailed': 'Stripe 載入失敗',
    'auth.defaultTitle': '歡迎回來',
    'auth.defaultDescription': '登入您的帳號以繼續',
    'ticket.fillRequired': '請填寫必填欄位',
  },
  'ja-JP.ts': {
    'invite.withdrawLimitHint': '最低出金額：{limit}',
    'invite.withdrawFeeHint': '出金手数料：{rate}%',
    'invite.withdrawFullBalanceHint': '利用可能な全コミッションを出金します（手数料差引後）',
    'invite.withdrawMethodRequired': '出金方法を選択してください',
    'invite.withdrawAccountRequired': '出金口座を入力してください',
  },
  'ko-KR.ts': {
    'invite.withdrawLimitHint': '최소 출금액: {limit}',
    'invite.withdrawFeeHint': '출금 수수료: {rate}%',
    'invite.withdrawFullBalanceHint': '사용 가능한 전체 커미션을 출금합니다(수수료 제외)',
    'invite.withdrawMethodRequired': '출금 방법을 선택하세요',
    'invite.withdrawAccountRequired': '출금 계정을 입력하세요',
  },
  'vi-VN.ts': {
    'invite.withdrawLimitHint': 'Số tiền rút tối thiểu: {limit}',
    'invite.withdrawFeeHint': 'Phí rút: {rate}%',
    'invite.withdrawFullBalanceHint': 'Rút toàn bộ hoa hồng khả dụng (trừ phí)',
    'invite.withdrawMethodRequired': 'Vui lòng chọn phương thức rút',
    'invite.withdrawAccountRequired': 'Vui lòng nhập tài khoản rút',
  },
  'fa-IR.ts': {
    'invite.withdrawLimitHint': 'حداقل برداشت: {limit}',
    'invite.withdrawFeeHint': 'کارمزد برداشت: {rate}%',
    'invite.withdrawFullBalanceHint': 'کل کمیسیون موجود برداشت می‌شود (پس از کسر کارمزد)',
    'invite.withdrawMethodRequired': 'روش برداشت را انتخاب کنید',
    'invite.withdrawAccountRequired': 'حساب برداشت را وارد کنید',
  },
}

function patchKey(content, dottedKey, value) {
  const parts = dottedKey.split('.')
  const top = parts[0]
  const leaf = parts[parts.length - 1]
  const escaped = leaf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${top}[\\s\\S]*?${escaped}:\\s*)(["\'])[^"\']*\\2`)
  if (re.test(content)) {
    return content.replace(re, `$1${JSON.stringify(value)}`)
  }
  const blockRe = new RegExp(`(${top}:\\s*\\{)`)
  if (blockRe.test(content)) {
    const insert = `\n    ${leaf}: ${JSON.stringify(value)},`
    return content.replace(blockRe, `$1${insert}`)
  }
  console.warn(`Could not patch ${dottedKey} in file`)
  return content
}

for (const [file, patches] of Object.entries(PATCHES)) {
  const filePath = path.join(localeDir, file)
  let content = fs.readFileSync(filePath, 'utf8')
  for (const [key, value] of Object.entries(patches)) {
    content = patchKey(content, key, value)
  }
  fs.writeFileSync(filePath, content)
  console.log(`Patched ${file}`)
}

console.log('R35 locale patches done.')
