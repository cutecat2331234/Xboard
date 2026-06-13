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

async function giftSwitches(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/finance/gift-card`)
  await page.waitForSelector('tbody tr', { timeout: 45000 })
  await page.locator('[data-testid="gift-template-edit"], tbody button:has-text("编辑")').first().click()
  await page.waitForSelector('[role=dialog]')
  const data = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    const switches = [...(dlg?.querySelectorAll('[role=switch]') || [])]
    return switches.map((s, i) => ({
      i,
      rowCls: s.closest('.rounded-md')?.className?.slice(0, 120),
      rowHtml: s.closest('.rounded-md')?.outerHTML?.slice(0, 450),
      parentGrid: s.closest('.grid')?.className,
    }))
  })
  console.log(tag, JSON.stringify(data, null, 2))
  await browser.close()
}

async function planPrice(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/finance/plan`)
  await page.waitForSelector('tbody tr', { timeout: 45000 })
  await page.locator('button:has-text("添加套餐")').first().click()
  await page.waitForSelector('[role=dialog]')
  const data = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    const priceBox = [...(dlg?.querySelectorAll('.border-dashed') || [])].find((el) =>
      el.textContent?.includes('价格') || el.textContent?.includes('Price'),
    )
    const contentTa = dlg?.querySelector('textarea')
    return {
      priceBoxH: priceBox ? Math.round(priceBox.getBoundingClientRect().height) : null,
      priceBoxCls: priceBox?.className?.slice(0, 100),
      contentTaMinH: contentTa ? getComputedStyle(contentTa).minHeight : null,
      contentTaH: contentTa ? Math.round(contentTa.getBoundingClientRect().height) : null,
    }
  })
  console.log(tag, JSON.stringify(data))
  await browser.close()
}

await giftSwitches(REF, '7001-gift')
await giftSwitches(CMP, '7002-gift')
await planPrice(REF, '7001-plan')
await planPrice(CMP, '7002-plan')
