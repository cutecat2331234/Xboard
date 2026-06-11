import { chromium } from 'playwright'

const base = process.env.BASE || 'http://43.248.77.134:7001'
const email = 'admin@xboard.local'
const password = 'Xboard@2026'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(`${base}/#/login`)
await page.locator('input[type="email"], input[placeholder*="邮箱"]').first().fill(email)
await page.locator('input[type="password"]').first().fill(password)
await page.locator('button[type="submit"], .n-button--primary-type').last().click()
await page.waitForTimeout(3000)

const tradeNo = await page.evaluate(async () => {
  const headers = { Authorization: localStorage.getItem('xboard_auth_data'), Accept: 'application/json' }
  const res = await fetch('/api/v1/user/order/fetch', { headers })
  const json = await res.json()
  return json.data?.find((o) => o.status === 0)?.trade_no ?? json.data?.[0]?.trade_no
})

console.log('trade_no', tradeNo)
await page.goto(`${base}/#/order/${tradeNo}`)
await page.waitForTimeout(5000)
console.log('--- body text ---')
console.log(await page.locator('body').innerText())
console.log('--- main html snippet ---')
const html = await page.evaluate(() => {
  const main = document.querySelector('.n-layout-scroll-container') || document.querySelector('#app')
  return main?.innerHTML?.slice(0, 8000) ?? ''
})
console.log(html)
await browser.close()
