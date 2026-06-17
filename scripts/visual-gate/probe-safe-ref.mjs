import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const SEC = process.env.SECURE_PATH || ''

async function login(page) {
  await page.goto(`${REF}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  if (page.url().includes('sign-in')) {
    await page.locator('input[type=email],input[name=email]').first().fill('admin@example.com')
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForTimeout(3000)
  }
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await login(page)
await page.goto(`${REF}/${SEC}#/config/system/safe`, { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.waitForTimeout(3000)
const data = await page.evaluate(() => {
  const main = document.querySelector('main') || document.body
  return {
    labels: [...main.querySelectorAll('label')].map((l) => l.textContent?.trim()),
    switches: main.querySelectorAll('[role=switch]').length,
    comboboxes: main.querySelectorAll('[role=combobox]').length,
    inputs: main.querySelectorAll('input:not([type=hidden])').length,
    textareas: main.querySelectorAll('textarea').length,
  }
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
