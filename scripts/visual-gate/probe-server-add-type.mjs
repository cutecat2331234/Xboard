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
  await page.waitForTimeout(1500)
  if ((await page.locator('input[type=password]').count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@xboard.local')
    await page.locator('input[type=password]').first().fill('Xboard@2026')
    await page.locator('button[type=submit],form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 45000 })
  }
  await page.waitForTimeout(2000)
}

async function probe(base, label) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/server/manage`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('tbody tr', { timeout: 45000 })
  await page.locator('button:has-text("添加节点")').first().click()
  await page.waitForSelector('[role=dialog]', { timeout: 10000 })
  await page.waitForTimeout(800)

  const data = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    const typeBtn = dlg?.querySelector('header [role=combobox], .border-b [role=combobox]')
    const dashed = dlg?.querySelectorAll('.border-dashed')
    const tabs = dlg?.querySelectorAll('[role=tablist]')
    return {
      typeText: typeBtn?.textContent?.trim(),
      dashedCount: dashed?.length ?? 0,
      tabCount: tabs?.length ?? 0,
      hasProtocol: Boolean(dlg?.querySelector('.border-dashed, [role=tablist]')),
      labels: [...(dlg?.querySelectorAll('label') || [])].map((l) => l.textContent?.trim()).filter(Boolean).slice(0, 20),
    }
  })
  console.log(label, JSON.stringify(data, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
