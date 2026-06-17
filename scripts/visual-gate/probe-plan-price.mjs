import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('xboard_admin_auth_data')
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload()
  await page.waitForTimeout(1500)
  await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
  await page.locator('input[type=password]').first().fill('your-password')
  await page.locator('button[type=submit],form button').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
}

async function planFields(base, tag) {
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
      /价格|Price|月付/.test(el.textContent || ''),
    )
    const periods = [...(priceBox?.querySelectorAll('label') || [])].slice(0, 2).map((l) => ({
      text: l.textContent?.trim().slice(0, 10),
      cls: l.className,
      h: Math.round(l.getBoundingClientRect().height),
    }))
    return {
      priceBoxH: priceBox ? Math.round(priceBox.getBoundingClientRect().height) : null,
      priceBoxCls: priceBox?.className,
      periods,
      scrollH: dlg?.querySelector('.overflow-y-auto')?.scrollHeight,
    }
  })
  console.log(tag, JSON.stringify(data, null, 2))
  await browser.close()
}

await planFields(REF, '7001')
await planFields(CMP, '7002')
