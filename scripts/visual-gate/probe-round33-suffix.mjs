import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SECURE = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => localStorage.setItem('xboard_admin_locale', 'zh-CN'))
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[type=email],input[type=text]').first().fill('admin@example.com')
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForTimeout(3000)
  }
}

async function probe(base, name) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SECURE}#/user/manage`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector('tbody tr', { timeout: 45000 })
  await page.locator('tbody tr').first().locator('button').last().click()
  await page.locator('[role=menuitem]').filter({ hasText: '编辑' }).first().click()
  await page.waitForSelector('[role=dialog]')
  const data = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    const balanceLabel = [...dlg.querySelectorAll('label')].find((l) => l.textContent?.includes('余额') && !l.textContent?.includes('佣金'))
    const balanceField = balanceLabel?.parentElement
    return {
      balanceHtml: balanceField?.innerHTML?.slice(0, 400),
      suffixSpans: balanceField?.querySelectorAll('span').length,
      switchCount: dlg.querySelectorAll('[role=switch]').length,
      switchClass: dlg.querySelector('[role=switch]')?.className?.slice(0, 80),
    }
  })
  console.log(name, JSON.stringify(data, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
