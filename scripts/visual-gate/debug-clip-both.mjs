import { chromium } from 'playwright'

const browser = await chromium.launch()
for (const [name, base] of [['7001', 'http://127.0.0.1:7001'], ['7002', 'http://127.0.0.1:7002']]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto(`${base}/#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {})
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[type=text],input[type=email]').first().fill('admin@example.com')
    await page.locator('input[type=password]').fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForTimeout(2500)
  }
  await page.goto(`${base}/#/config/system/safe`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(5000)
  const info = await page.evaluate(() => {
    const main = document.querySelector('.flex-1.w-full')
    const aside = document.querySelector('aside')
    const toolbar = document.querySelector('header') || document.querySelector('[class*="PageToolbar"]')
    return {
      main: main?.getBoundingClientRect(),
      aside: aside?.getBoundingClientRect(),
      toolbar: toolbar?.getBoundingClientRect(),
      h3: document.querySelector('h3')?.textContent,
      fields: document.querySelectorAll('.xb-stack-2, .space-y-2').length,
    }
  })
  console.log(name, JSON.stringify(info, null, 2))
  await page.close()
}
await browser.close()
