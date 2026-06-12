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
  await page.waitForTimeout(2000)
}

async function probePlan(base, label) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/finance/plan`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('tbody tr', { timeout: 45000 })
  await page.locator('button:has-text("添加套餐")').first().click()
  await page.waitForSelector('[role=dialog]', { timeout: 10000 })
  await page.waitForTimeout(500)

  const data = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    const r = dlg?.getBoundingClientRect()
    const header = dlg?.querySelector('[class*="DialogHeader"], .border-b, header')
    const footer = dlg?.querySelector('footer, [class*="DialogFooter"]')
    const scroll = dlg?.querySelector('.overflow-y-auto')
    const firstInput = dlg?.querySelector('input')
    return {
      dialog: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
      scrollH: scroll ? Math.round(scroll.getBoundingClientRect().height) : null,
      footerH: footer ? Math.round(footer.getBoundingClientRect().height) : null,
      inputShadow: firstInput ? getComputedStyle(firstInput).boxShadow.slice(0, 60) : null,
      fieldBlocks: [...(scroll?.querySelectorAll('.grid, [class*="xb-stack"], [class*="space-y"]') || [])]
        .slice(0, 6)
        .map((el) => ({ cls: el.className.slice(0, 80), h: Math.round(el.getBoundingClientRect().height) })),
    }
  })
  console.log(label, JSON.stringify(data, null, 2))
  await browser.close()
}

await probePlan(REF, '7001')
await probePlan(CMP, '7002')
