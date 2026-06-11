import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = ''

const ROUTES = ['#/config/system/safe', '#/config/system/subscribe', '#/config/system/invite']

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(1500)
  const pwd = page.locator('input[type=password]')
  if ((await pwd.count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
    await pwd.first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
  }
}

function mainFields() {
  const main = document.querySelector('.flex-1.w-full.p-1') || document.querySelector('main')
  if (!main) return null
  return {
    labels: [...main.querySelectorAll('label.font-medium, label.text-base')].map((l) => l.textContent?.trim()),
    switches: main.querySelectorAll('[role=switch]').length,
    inputs: main.querySelectorAll('input:not([type=hidden])').length,
    combobox: main.querySelectorAll('[role=combobox]').length,
    textareas: main.querySelectorAll('textarea').length,
  }
}

const browser = await chromium.launch()
for (const hash of ROUTES) {
  console.log(`\n=== ${hash} ===`)
  for (const [name, base] of [
    ['7001', REF],
    ['7002', CMP],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await login(page, base)
    await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    console.log(name, await page.evaluate(mainFields))
    await page.close()
  }
}
await browser.close()
