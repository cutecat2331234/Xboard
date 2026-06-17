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

async function clickFailed(base, label) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await login(page, base)
  await page.goto(`${base}/${SEC}#/`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForTimeout(3000)
  const trigger = page.locator('[title*="报错"], span.text-destructive, button.text-destructive').first()
  await trigger.click({ timeout: 8000 })
  await page.waitForTimeout(1500)
  const after = await page.evaluate(() => ({
    dialogs: document.querySelectorAll('[role=dialog]').length,
    radix: document.querySelectorAll('[data-state=open][role=dialog]').length,
    sheet: document.querySelectorAll('[role=dialog], .n-modal').length,
    titles: [...document.querySelectorAll('[role=dialog] *, .n-dialog__title, h2')].map((e) => e.textContent?.trim()).filter((t) => t && t.length < 40).slice(0, 5),
  }))
  console.log(label, JSON.stringify(after))
  await browser.close()
}

await clickFailed(REF, '7001')
await clickFailed(CMP, '7002')
