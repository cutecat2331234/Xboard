import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(1500)
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 30000 })
  }
}

async function probe(base, label, hash) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await login(page, base)
  await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(3500)
  const info = await page.evaluate(() => ({
    labels: [...document.querySelectorAll('label')].map((l) => l.textContent?.trim()).filter(Boolean),
    combobox: document.querySelectorAll('[role=combobox]').length,
    switches: document.querySelectorAll('[role=switch]').length,
    switchStates: [...document.querySelectorAll('[role=switch]')].map((s) => s.getAttribute('data-state')),
    inputs: document.querySelectorAll('input:not([type=hidden])').length,
    selects: document.querySelectorAll('select').length,
    visibleFields: [...document.querySelectorAll('.flex.flex-col.gap-4 > *')].length,
  }))
  console.log(label, hash, JSON.stringify(info))
  await browser.close()
}

for (const hash of ['#/config/system/safe', '#/config/system/subscribe', '#/config/system/invite']) {
  await probe(REF, '7001', hash)
  await probe(CMP, '7002', hash)
}
