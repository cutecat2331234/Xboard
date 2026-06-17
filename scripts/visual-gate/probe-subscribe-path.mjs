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
  const pwd = page.locator('input[type=password]')
  if ((await pwd.count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
    await pwd.first().fill('your-password')
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
  await page.goto(`${base}/${SEC}#/config/system/subscribe`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const html = await page.evaluate(() => {
    const label = [...document.querySelectorAll('label')].find((l) => l.textContent?.includes('订阅路径'))
    const block = label?.closest('.space-y-2')
    return block?.outerHTML?.slice(0, 900)
  })
  const selectWidths = await page.evaluate(() =>
    [...document.querySelectorAll('[role=combobox]')].map((el) => ({
      text: el.textContent?.trim().slice(0, 30),
      w: Math.round(el.getBoundingClientRect().width),
    })),
  )
  console.log(`\n${name} subscribe_path:\n`, html)
  console.log(`${name} combobox widths:`, selectWidths)
  await page.close()
}
await browser.close()
