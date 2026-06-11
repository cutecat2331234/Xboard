import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const SECURE = 'd7f5c92b'

async function login(page) {
  await page.goto(`${REF}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => localStorage.setItem('xboard_admin_locale', 'zh-CN'))
  await page.reload().catch(() => {})
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[type=email],input[type=text]').first().fill('admin@xboard.local')
    await page.locator('input[type=password]').first().fill('Xboard@2026')
    await page.locator('button[type=submit]').last().click()
    await page.waitForTimeout(3000)
  }
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await login(page)
await page.goto(`${REF}/${SECURE}#/user/manage`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('tbody tr')
await page.locator('tbody tr').first().locator('button').last().click()
await page.locator('[role=menuitem]').filter({ hasText: '编辑' }).first().click()
await page.waitForSelector('[role=dialog]')

const fields = await page.evaluate(() => {
  const dlg = document.querySelector('[role=dialog]')
  const names = ['余额', '已用上行', '流量', '限速']
  return names.map((name) => {
    const lbl = [...dlg.querySelectorAll('label')].find((l) => l.textContent?.includes(name))
    const item = lbl?.closest('[class*="space-y"]') || lbl?.parentElement
    return { name, html: item?.innerHTML?.slice(0, 800) }
  })
})
console.log(JSON.stringify(fields, null, 2))
await browser.close()
