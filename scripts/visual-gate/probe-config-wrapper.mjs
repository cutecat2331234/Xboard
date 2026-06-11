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
  await page.goto(`${base}/${SEC}#/config/system/invite`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const r = await page.evaluate(() => {
    const form = document.querySelector('.space-y-4')
    const parent = form?.parentElement
    return {
      formCls: form?.className,
      parentCls: parent?.className,
      grandCls: parent?.parentElement?.className,
    }
  })
  console.log(name, r)
  await page.close()
}
await browser.close()
