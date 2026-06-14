#!/usr/bin/env node
/** Apply R33 translations for ja/ko/vi/fa user locales (errors tail + missing plan/order keys). */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const localeDir = path.join(root, 'frontend/user/src/i18n/locales')

const PATCHES = {
  'ja-JP.ts': {
    'plan.processingOrderDesc': '開通処理中の注文があります。しばらくお待ちいただくか、注文ページをご確認ください。',
    'order.noPaymentMethods': '利用可能な支払い方法がありません。サポートにお問い合わせください。',
    'order.cancelledDuringPay': '注文はキャンセルされ、支払いは完了しませんでした。',
    'errors.paymentNotFound': 'Stripe 支払い方法が見つかりません',
    'errors.paymentInProgress': 'この注文は支払い処理中です。キャンセルできません。',
    'errors.ticketWaitForReply': 'スタッフの返信をお待ちください。',
    'errors.ticketClosedReply': 'チケットは終了しており、返信できません。',
    'errors.ticketClosed': 'チケットは終了しています',
    'errors.ticketReplyFailed': '返信に失敗しました',
    'errors.ticketCloseFailed': 'クローズに失敗しました',
    'errors.ticketSubjectEmpty': '件名を入力してください',
    'errors.invalidCoupon': '無効なクーポンです',
    'errors.couponEmpty': 'クーポンコードを入力してください',
    'errors.couponPlanMismatch': 'このクーポンは選択したプランに適用できません',
    'errors.couponPeriodMismatch': 'このクーポンは選択した周期に適用できません',
    'errors.couponExpired': 'クーポンの有効期限が切れています',
    'errors.couponUsedUp': 'クーポンの使用回数上限に達しました',
    'errors.giftCardNotFound': '引き換えコードが見つかりません',
    'errors.giftCardDisabled': 'このギフトカードは無効です',
    'errors.giftCardIneligible': 'このギフトカードの利用条件を満たしていません',
    'errors.giftCardLimitReached': 'このギフトカードの利用上限に達しました',
    'errors.giftCardQueryFailed': '照会に失敗しました。後でもう一度お試しください。',
  },
  'ko-KR.ts': {
    'plan.processingOrderDesc': '처리 중인 주문이 있습니다. 잠시 후 다시 시도하거나 주문 페이지를 확인하세요.',
    'order.noPaymentMethods': '사용 가능한 결제 수단이 없습니다. 고객 지원에 문의하세요.',
    'order.cancelledDuringPay': '주문이 취소되어 결제가 완료되지 않았습니다.',
    'errors.paymentNotFound': 'Stripe 결제 수단을 찾을 수 없습니다',
    'errors.paymentInProgress': '이 주문은 결제 처리 중입니다. 취소할 수 없습니다.',
    'errors.ticketWaitForReply': '직원의 답변을 기다려 주세요.',
    'errors.ticketClosedReply': '티켓이 종료되어 답변할 수 없습니다.',
    'errors.ticketClosed': '티켓이 종료되었습니다',
    'errors.ticketReplyFailed': '답변에 실패했습니다',
    'errors.ticketCloseFailed': '종료에 실패했습니다',
    'errors.ticketSubjectEmpty': '제목을 입력하세요',
    'errors.invalidCoupon': '유효하지 않은 쿠폰입니다',
    'errors.couponEmpty': '쿠폰 코드를 입력하세요',
    'errors.couponPlanMismatch': '이 쿠폰은 선택한 요금제에 적용할 수 없습니다',
    'errors.couponPeriodMismatch': '이 쿠폰은 선택한 기간에 적용할 수 없습니다',
    'errors.couponExpired': '쿠폰이 만료되었습니다',
    'errors.couponUsedUp': '쿠폰 사용 한도에 도달했습니다',
    'errors.giftCardNotFound': '교환 코드를 찾을 수 없습니다',
    'errors.giftCardDisabled': '이 기프트 카드는 비활성화되었습니다',
    'errors.giftCardIneligible': '이 기프트 카드 사용 조건을 충족하지 않습니다',
    'errors.giftCardLimitReached': '이 기프트 카드 사용 한도에 도달했습니다',
    'errors.giftCardQueryFailed': '조회에 실패했습니다. 나중에 다시 시도하세요.',
  },
  'vi-VN.ts': {
    'plan.processingOrderDesc': 'Bạn có đơn hàng đang được xử lý. Vui lòng đợi hoặc kiểm tra trang đơn hàng.',
    'order.noPaymentMethods': 'Không có phương thức thanh toán. Vui lòng liên hệ hỗ trợ.',
    'order.cancelledDuringPay': 'Đơn hàng đã bị hủy, thanh toán chưa hoàn tất.',
    'errors.paymentNotFound': 'Không tìm thấy phương thức thanh toán Stripe',
    'errors.paymentInProgress': 'Đơn hàng đang thanh toán, không thể hủy.',
    'errors.ticketWaitForReply': 'Vui lòng đợi nhân viên phản hồi.',
    'errors.ticketClosedReply': 'Phiếu đã đóng, không thể trả lời.',
    'errors.ticketClosed': 'Phiếu đã đóng',
    'errors.ticketReplyFailed': 'Gửi phản hồi thất bại',
    'errors.ticketCloseFailed': 'Đóng phiếu thất bại',
    'errors.ticketSubjectEmpty': 'Vui lòng nhập tiêu đề',
    'errors.invalidCoupon': 'Mã giảm giá không hợp lệ',
    'errors.couponEmpty': 'Vui lòng nhập mã giảm giá',
    'errors.couponPlanMismatch': 'Mã không áp dụng cho gói đã chọn',
    'errors.couponPeriodMismatch': 'Mã không áp dụng cho chu kỳ đã chọn',
    'errors.couponExpired': 'Mã giảm giá đã hết hạn',
    'errors.couponUsedUp': 'Mã đã hết lượt sử dụng',
    'errors.giftCardNotFound': 'Không tìm thấy mã quy đổi',
    'errors.giftCardDisabled': 'Thẻ quà tặng này đã bị vô hiệu',
    'errors.giftCardIneligible': 'Bạn không đủ điều kiện dùng thẻ quà tặng này',
    'errors.giftCardLimitReached': 'Bạn đã đạt giới hạn sử dụng thẻ quà tặng này',
    'errors.giftCardQueryFailed': 'Truy vấn thất bại, vui lòng thử lại sau.',
  },
  'fa-IR.ts': {
    'plan.processingOrderDesc': 'سفارشی در حال پردازش است. لطفاً صبر کنید یا صفحه سفارش را بررسی کنید.',
    'order.noPaymentMethods': 'روش پرداختی در دسترس نیست. با پشتیبانی تماس بگیرید.',
    'order.cancelledDuringPay': 'سفارش لغو شد و پرداخت تکمیل نشد.',
    'errors.paymentNotFound': 'روش پرداخت Stripe یافت نشد',
    'errors.paymentInProgress': 'این سفارش در حال پرداخت است و قابل لغو نیست.',
    'errors.ticketWaitForReply': 'لطفاً منتظر پاسخ پشتیبانی بمانید.',
    'errors.ticketClosedReply': 'تیکت بسته شده و قابل پاسخ نیست.',
    'errors.ticketClosed': 'تیکت بسته شده است',
    'errors.ticketReplyFailed': 'ارسال پاسخ ناموفق بود',
    'errors.ticketCloseFailed': 'بستن تیکت ناموفق بود',
    'errors.ticketSubjectEmpty': 'لطفاً موضوع را وارد کنید',
    'errors.invalidCoupon': 'کد تخفیف نامعتبر است',
    'errors.couponEmpty': 'لطفاً کد تخفیف را وارد کنید',
    'errors.couponPlanMismatch': 'این کد برای طرح انتخاب‌شده معتبر نیست',
    'errors.couponPeriodMismatch': 'این کد برای دوره انتخاب‌شده معتبر نیست',
    'errors.couponExpired': 'کد تخفیف منقضی شده است',
    'errors.couponUsedUp': 'سقف استفاده از کد تخفیف پر شده است',
    'errors.giftCardNotFound': 'کد هدیه یافت نشد',
    'errors.giftCardDisabled': 'این کارت هدیه غیرفعال است',
    'errors.giftCardIneligible': 'شرایط استفاده از این کارت هدیه را ندارید',
    'errors.giftCardLimitReached': 'به سقف استفاده از این کارت هدیه رسیده‌اید',
    'errors.giftCardQueryFailed': 'استعلام ناموفق بود، بعداً دوباره تلاش کنید.',
  },
}

function applyPatch(file, patches) {
  const fp = path.join(localeDir, file)
  let content = fs.readFileSync(fp, 'utf8')
  let count = 0
  for (const [keyPath, value] of Object.entries(patches)) {
    const [section, prop] = keyPath.split('.')
    const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const re = new RegExp(`(${section}:\\s*\\{[\\s\\S]*?\\n\\s*${prop}:\\s*)'(?:\\\\.|[^'\\\\])*'`)
    if (re.test(content)) {
      content = content.replace(re, `$1'${escaped}'`)
      count++
    } else {
      console.warn(file, 'missing key', keyPath)
    }
  }
  fs.writeFileSync(fp, content)
  console.log(file, 'patched', count, 'keys')
}

for (const [file, patches] of Object.entries(PATCHES)) {
  applyPatch(file, patches)
}
