import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SECURE = ''

async function login(page, base) {
  await page.goto(`${base}/${SECURE}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
    await page.locator('input[type=password]').first().fill('your-password')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 30000 }).catch(() => {})
  }
  await page.waitForTimeout(2000)
}

async function probeUserEdit(base, name) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SECURE}#/user/manage`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('tbody tr', { timeout: 30000 })
  const menu = page.locator('tbody tr').first().locator('button').last()
  await menu.click()
  await page.locator('[role=menuitem]:has-text("编辑")').first().click()
  await page.waitForSelector('[role=dialog]', { timeout: 10000 })
  const info = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    if (!dlg) return null
    const labels = [...dlg.querySelectorAll('label')].map((l) => l.textContent?.trim()).filter(Boolean)
    const inputs = [...dlg.querySelectorAll('input,select,textarea')].map((el) => ({
      tag: el.tagName,
      type: el.getAttribute('type'),
      placeholder: el.getAttribute('placeholder'),
      value: el.value?.slice(0, 30),
    }))
    const footer = dlg.querySelector('button[type=submit], footer button, .flex button')?.textContent?.trim()
    const buttons = [...dlg.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter(Boolean)
    const rect = dlg.getBoundingClientRect()
    return { labels, inputs, buttons, rect: { w: rect.width, h: rect.height } }
  })
  console.log(`\n=== ${name} ===`)
  console.log(JSON.stringify(info, null, 2))
  await browser.close()
}

await probeUserEdit(REF, '7001')
await probeUserEdit(CMP, '7002')
