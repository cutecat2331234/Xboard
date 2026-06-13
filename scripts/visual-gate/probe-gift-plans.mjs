import { chromium } from 'playwright'

const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const SEC = 'd7f5c92b'

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('xboard_admin_auth_data')
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
  })
  await page.reload()
  await page.waitForTimeout(1500)
  await page.locator('input[type=text]').first().fill('admin@xboard.local')
  await page.locator('input[type=password]').first().fill('Xboard@2026')
  await page.locator('form button').last().click()
  await page.waitForFunction(() => !location.hash.includes('sign-in'))
}

async function probe(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/finance/gift-card`)
  await page.waitForSelector('tbody tr')
  await page.locator('[data-testid="gift-template-edit"], tbody button:has-text("编辑")').first().click()
  await page.waitForSelector('[role=dialog]')
  const html = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    const labels = [...(dlg?.querySelectorAll('label') || [])]
    const allowedIdx = labels.findIndex((l) => /允许的套餐|Allowed Plans/.test(l.textContent || ''))
    const slice = labels.slice(allowedIdx, allowedIdx + 4).map((l) => ({
      text: JSON.stringify(l.textContent?.trim()),
      html: l.outerHTML.slice(0, 200),
      next: l.nextElementSibling?.outerHTML?.slice(0, 150),
    }))
    const special = [...(dlg?.querySelectorAll('h3') || [])].find((h) => /特殊|special/i.test(h.textContent || ''))
    return {
      allowed: slice,
      specialSection: special?.parentElement?.nextElementSibling?.outerHTML?.slice(0, 800),
    }
  })
  console.log(tag, JSON.stringify(html, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
