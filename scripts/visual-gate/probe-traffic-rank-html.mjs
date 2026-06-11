import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const SEC = 'd7f5c92b'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto(`${REF}/${SEC}#/sign-in`, { waitUntil: 'networkidle', timeout: 120000 })
await page.evaluate(() => {
  localStorage.setItem('xboard_admin_locale', 'zh-CN')
})
await page.reload({ waitUntil: 'networkidle' }).catch(() => {})
if (page.url().includes('sign-in')) {
  await page.locator('input#email, input[name="email"]').first().fill('admin@xboard.local')
  await page.locator('input[type="password"]').first().fill('Xboard@2026')
  await page.locator('button[type="submit"], form button').last().click()
  await page.waitForTimeout(4000)
}
await page.goto(`${REF}/${SEC}#/`, { waitUntil: 'networkidle', timeout: 120000 })
await page.waitForTimeout(3000)

const html = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.rounded-xl.border')]
  const rankCard = cards.find((c) => c.textContent?.includes('节点流量排行') || c.textContent?.includes('流量排行'))
  return rankCard?.innerHTML?.slice(0, 2500) ?? 'not found'
})
console.log(html)
await browser.close()
