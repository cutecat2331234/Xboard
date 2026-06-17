import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const SEC = process.env.SECURE_PATH || ''

async function login(page) {
  await page.goto(`${REF}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  if (page.url().includes('sign-in')) {
    await page.locator('input[type=email]').first().fill('admin@example.com')
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForTimeout(3000)
  }
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await login(page)
await page.goto(`${REF}/${SEC}#/`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)
const info = await page.evaluate(() =>
  [...document.querySelectorAll('aside .lucide')].map((el) => ({
    tag: el.tagName,
    cls: el.getAttribute('class'),
    parent: el.parentElement?.textContent?.trim().slice(0, 40),
  })),
)
console.log(JSON.stringify(info, null, 2))
await browser.close()
