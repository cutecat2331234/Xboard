import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SEC = 'd7f5c92b'

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  const pwd = page.locator('input[type=password]')
  if ((await pwd.count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@xboard.local')
    await pwd.first().fill('Xboard@2026')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
  }
}

const browser = await chromium.launch()
for (const [name, base] of [
  ['7001', REF],
  ['7002', CMP],
]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/config/system/safe`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(5000)
  const r = await page.evaluate(() => ({
    labels: [...document.querySelectorAll('main label, .flex-1 label')].map((l) => l.textContent?.trim()).filter(Boolean),
    switches: [...document.querySelectorAll('[role=switch]')].map((s) => ({
      checked: s.getAttribute('aria-checked'),
      y: Math.round(s.getBoundingClientRect().y),
    })),
  }))
  console.log(name, JSON.stringify(r, null, 2))
  await page.close()
}
await browser.close()
