#!/usr/bin/env node
/** R34: vi plan block, fa profile, missing invite/profile keys across ja/ko/vi/fa/zh-TW. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const localeDir = path.join(root, 'frontend/user/src/i18n/locales')

const SHARED = {
  'invite.peopleCount': {
    'ja-JP.ts': '{number} 人',
    'ko-KR.ts': '{number}명',
    'vi-VN.ts': '{number} người',
    'fa-IR.ts': '{number} نفر',
    'zh-TW.ts': '{number} 人',
  },
  'profile.telegramUnbind': {
    'ja-JP.ts': 'Telegram の連携を解除',
    'ko-KR.ts': 'Telegram 연동 해제',
    'vi-VN.ts': 'Hủy liên kết Telegram',
    'fa-IR.ts': 'قطع اتصال تلگرام',
    'zh-TW.ts': '解綁 Telegram',
  },
  'profile.telegramUnbindConfirm': {
    'ja-JP.ts': 'Telegram アカウントの連携を解除しますか？再度 /bind で連携してください。',
    'ko-KR.ts': 'Telegram 계정 연동을 해제하시겠습니까? 봇에 /bind 를 다시 보내야 합니다.',
    'vi-VN.ts': 'Hủy liên kết Telegram? Bạn cần gửi /bind cho bot để liên kết lại.',
    'fa-IR.ts': 'اتصال تلگرام قطع شود؟ برای اتصال مجدد باید /bind را به ربات بفرستید.',
    'zh-TW.ts': '確定要解綁 Telegram 帳號嗎？解綁後需重新透過機器人 /bind 綁定。',
  },
}

const VI_PLAN = {
  'plan.name': 'Gói',
  'plan.selectPeriod': 'Chọn chu kỳ',
  'plan.coupon': 'Mã giảm giá',
  'plan.couponPh': 'Nhập mã giảm giá',
  'plan.couponApplied': 'Đã áp dụng mã',
  'plan.couponDiscount': 'Giảm giá',
  'plan.buyNow': 'Mua ngay',
  'plan.noPeriod': 'Không có chu kỳ mua được',
  'plan.pendingOrderTitle': 'Đơn hàng chờ thanh toán',
  'plan.pendingOrderDesc': 'Bạn có đơn chưa thanh toán. Hủy để tiếp tục?',
  'plan.cancelPending': 'Hủy đơn',
  'plan.empty': 'Không có gói nào',
  'plan.loadFailed': 'Tải gói thất bại',
  'plan.periodPricesHint': 'Giá theo chu kỳ',
  'plan.capacityRemaining': 'Còn {count} suất',
  'plan.tryOutBadge': 'Gói dùng thử',
  'plan.tryOutHint': 'Gói dùng thử đăng ký. Người dùng mới nhận dùng thử tự động; bạn cũng có thể mua tại đây.',
}

const VI_MISC = {
  'invite.people': 'người',
  'traffic.hint': 'Nhật ký lưu lượng chỉ giữ trong tháng qua.',
  'traffic.empty': 'Không có dữ liệu lưu lượng',
  'ticket.open': 'Mở',
  'ticket.replyPh': 'Nhập phản hồi của bạn…',
  'ticket.closedReplyPh': 'Phiếu đã đóng — không thể trả lời',
  'ticket.closedHint': 'Phiếu này đã đóng. Bạn không thể gửi thêm phản hồi.',
  'ticket.closeSuccess': 'Đã đóng phiếu',
  'profile.telegramHint': 'Tìm bot này trên Telegram và gửi /bind:',
  'profile.telegramBound': 'Đã liên kết Telegram',
  'profile.telegramGroup': 'Tham gia nhóm Telegram',
  'errors.withdrawUnsupported': 'Không hỗ trợ rút tiền',
  'errors.insufficientCommission': 'Số dư hoa hồng không đủ',
  'errors.pendingWithdrawTicket': 'Bạn đã có yêu cầu rút tiền đang chờ',
  'errors.withdrawMinimum': 'Số tiền rút tối thiểu là {limit}',
  'errors.planChangeDisabled': 'Hiện không cho đổi gói. Vui lòng liên hệ hỗ trợ hoặc mở phiếu.',
  'errors.couponNotStarted': 'Mã giảm giá chưa có hiệu lực',
  'errors.couponPerUserLimit': 'Mỗi người chỉ được dùng mã này {limit} lần',
  'errors.giftCardRedeemFailed': 'Quy đổi thất bại. Vui lòng thử lại sau.',
}

const FA_PROFILE = {
  'profile.oldPasswordPh': 'Mورد نیاز است',
  'profile.accountInfo': 'حساب',
  'profile.subscribeToken': 'توکن اشتراک',
  'profile.activeSessions': 'نشست‌های فعال',
  'profile.sessionDevice': 'دستگاه',
  'profile.sessionCreated': 'ورود',
  'profile.sessionLastUsed': 'آخرین فعالیت',
  'profile.kickSession': 'لغو نشست',
  'profile.kickSessionConfirm': 'نشست «{device}» لغو شود؟',
  'profile.noSessions': 'نشست فعالی وجود ندارد',
  'profile.quickLogin': 'ورود سریع',
  'profile.quickLoginHint': 'یک لینک ورود یک‌بار مصرف برای ورود در دستگاه دیگر بسازید.',
  'profile.generateQuickLogin': 'ساخت لینک ورود سریع',
  'profile.quickLoginCopied': 'لینک ورود سریع در کلیپ‌بورد کپی شد',
  'profile.telegramHint': 'این ربات را در تلگرام جستجو کنید و /bind بفرستید:',
  'profile.telegramBound': 'تلگرام متصل است',
  'profile.telegramGroup': 'پیوستن به گروه تلگرام',
  'errors.couponNotStarted': 'کوپن هنوز فعال نشده است',
  'errors.couponPerUserLimit': 'هر کاربر فقط {limit} بار می‌تواند از این کوپن استفاده کند',
  'errors.giftCardRedeemFailed': 'بازخرید ناموفق بود. لطفاً بعداً دوباره تلاش کنید.',
}

const JA_KO_ERRORS = {
  'ja-JP.ts': {
    'errors.couponNotStarted': 'クーポンはまだ有効になっていません',
    'errors.couponPerUserLimit': 'このクーポンはお一人様 {limit} 回までです',
    'errors.giftCardRedeemFailed': '引き換えに失敗しました。後でもう一度お試しください。',
    'errors.oldPasswordWrong': '現在のパスワードが正しくありません',
    'errors.passwordTooShort': 'パスワードは8文字以上必要です',
    'errors.saveFailed': '保存に失敗しました',
    'errors.transferFailed': '振替に失敗しました',
    'errors.telegramNotBound': 'Telegram アカウントが連携されていません',
    'errors.telegramUnbindFailed': 'Telegram の連携解除に失敗しました',
  },
  'ko-KR.ts': {
    'errors.couponNotStarted': '쿠폰이 아직 시작되지 않았습니다',
    'errors.couponPerUserLimit': '이 쿠폰은 1인당 {limit}회까지 사용할 수 있습니다',
    'errors.giftCardRedeemFailed': '교환에 실패했습니다. 나중에 다시 시도하세요.',
    'errors.oldPasswordWrong': '현재 비밀번호가 올바르지 않습니다',
    'errors.passwordTooShort': '비밀번호는 8자 이상이어야 합니다',
    'errors.saveFailed': '저장에 실패했습니다',
    'errors.transferFailed': '이체에 실패했습니다',
    'errors.telegramNotBound': 'Telegram 계정이 연결되어 있지 않습니다',
    'errors.telegramUnbindFailed': 'Telegram 연동 해제에 실패했습니다',
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
  console.warn(`Could not patch ${dottedKey}`)
  return content
}

function applyPatches(file, patches) {
  const filePath = path.join(localeDir, file)
  let content = fs.readFileSync(filePath, 'utf8')
  for (const [key, value] of Object.entries(patches)) {
    content = patchKey(content, key, value)
  }
  fs.writeFileSync(filePath, content)
  console.log(`Patched ${file} (${Object.keys(patches).length} keys)`)
}

for (const [key, byFile] of Object.entries(SHARED)) {
  for (const [file, value] of Object.entries(byFile)) {
    applyPatches(file, { [key]: value })
  }
}

applyPatches('vi-VN.ts', { ...VI_PLAN, ...VI_MISC })
applyPatches('fa-IR.ts', FA_PROFILE)

for (const [file, patches] of Object.entries(JA_KO_ERRORS)) {
  applyPatches(file, patches)
}

// en-US + zh-CN new error keys
const baseErrors = {
  'errors.couponNotStarted': 'This coupon has not yet started',
  'errors.couponPerUserLimit': 'This coupon can only be used {limit} time(s) per person',
  'errors.giftCardRedeemFailed': 'Redemption failed. Please try again later.',
}
applyPatches('en-US.ts', baseErrors)
applyPatches('zh-CN.ts', {
  'errors.couponNotStarted': '优惠券尚未开始',
  'errors.couponPerUserLimit': '每人只能使用此优惠券 {limit} 次',
  'errors.giftCardRedeemFailed': '兑换失败，请稍后重试',
})

console.log('R34 locale patches done.')
