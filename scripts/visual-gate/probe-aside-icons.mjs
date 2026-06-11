import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SEC = 'd7f5c92b'

async function snap(base, label) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {})
  if (page.url().includes('sign-in')) {
    await page.locator('input#email').fill('admin@xboard.local')
    await page.locator('input#password').fill('Xboard@2026')
    await page.locator('button[type="submit"], form button').last().click()
    await page.waitForTimeout(4000)
  }
  await page.goto(`${base}/${SEC}#/`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForTimeout(2000)
  const info = await page.evaluate(() => {
    const asides = [...document.querySelectorAll('aside')]
    return asides.map((aside, i) => ({
      i,
      tabler: aside.querySelectorAll('.tabler-icon, [class*="tabler-icon"]').length,
      lucide: aside.querySelectorAll('.lucide').length,
      svgs: aside.querySelectorAll('svg').length,
      cls: aside.className?.slice(0, 60),
    }))
  })
  console.log(label, JSON.stringify(info, null, 2))
  await browser.close()
}

await snap(REF, '7001')
await snap(CMP, '7002')
