import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const SEC = 'd7f5c92b'

async function login(page) {
  await page.goto(`${REF}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  if (page.url().includes('sign-in')) {
    await page.locator('input[type=email]').first().fill('admin@xboard.local')
    await page.locator('input[type=password]').first().fill('Xboard@2026')
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
