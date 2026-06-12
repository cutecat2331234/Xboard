import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SEC = 'd7f5c92b'

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('xboard_admin_auth_data')
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload()
  await page.waitForTimeout(1500)
  await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@xboard.local')
  await page.locator('input[type=password]').first().fill('Xboard@2026')
  await page.locator('button[type=submit],form button').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
}

async function footerH(base, label) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/finance/plan`)
  await page.waitForSelector('tbody tr')
  await page.locator('button:has-text("添加套餐")').first().click()
  await page.waitForSelector('[role=dialog]')
  const h = await page.evaluate(() => {
    const f = document.querySelector('[role=dialog] [class*="DialogFooter"], [role=dialog] footer')
    return f ? Math.round(f.getBoundingClientRect().height) : null
  })
  console.log(label, 'footerH', h)
  await browser.close()
}

await footerH(REF, '7001')
await footerH(CMP, '7002')
