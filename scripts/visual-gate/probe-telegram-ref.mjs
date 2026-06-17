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
await page.goto(`${REF}/${SEC}#/config/system/telegram`, { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.waitForTimeout(3000)

const data = await page.evaluate(() => {
  const main = document.querySelector('main') || document.body
  const allLabels = [...main.querySelectorAll('label')].map((l) => l.textContent?.trim())
  const inputs = [...main.querySelectorAll('input')].map((i) => ({
    type: i.type,
    placeholder: i.placeholder,
    name: i.name,
  }))
  const buttons = [...main.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter(Boolean)
  const switches = main.querySelectorAll('[role=switch]').length
  const html = main.innerHTML.slice(0, 5000)
  return { allLabels, inputs, buttons, switches, textSnippet: main.innerText.slice(0, 1500) }
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
