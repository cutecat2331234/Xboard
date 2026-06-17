import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SECURE = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
  })
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
  await page.goto(`${base}/${SECURE}#/subscribe/plan`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector('button', { timeout: 45000 })
  await page.locator('button').filter({ hasText: /添加|新建/ }).first().click({ timeout: 15000 })
  await page.waitForSelector('[role=dialog]', { timeout: 15000 })
  const m = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    const r = dlg?.getBoundingClientRect()
    const labels = dlg?.querySelectorAll('label')?.length ?? 0
    const inputs = dlg?.querySelectorAll('input,select,button,[role=combobox]')?.length ?? 0
    const h = dlg?.scrollHeight
    return { w: r?.width, h: r?.height, scrollH: h, labels, inputs }
  })
  console.log(name, m)
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
