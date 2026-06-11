import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload()
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[type=email],input[name=email]').first().fill('admin@example.com')
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForTimeout(3000)
  }
}

async function switches(page, base) {
  await page.goto(`${base}/${SEC}#/config/system/safe`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForTimeout(4000)
  return page.evaluate(() =>
    [...document.querySelectorAll('[role=switch]')].map((el) => ({
      label: el.closest('.space-y-2,.xb-stack-2')?.querySelector('label')?.textContent?.trim(),
      checked: el.getAttribute('aria-checked'),
      state: el.getAttribute('data-state'),
    })),
  )
}

const browser = await chromium.launch()
for (const [name, base] of [
  ['7001', REF],
  ['7002', CMP],
]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await login(page, base)
  console.log(name, await switches(page, base))
  await page.close()
}
await browser.close()
