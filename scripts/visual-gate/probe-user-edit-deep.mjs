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
  await page.goto(`${base}/${SEC}#/user/manage`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('tbody tr', { timeout: 45000 })
  await page.locator('tbody tr').first().locator('button').last().click()
  await page.locator('[role=menuitem]:has-text("编辑")').first().click()
  await page.waitForSelector('[role=dialog][data-state=open]', { timeout: 10000 })
  await page.waitForTimeout(1000)

  const data = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog][data-state=open]')
    const r = dlg?.getBoundingClientRect()
    const labels = [...(dlg?.querySelectorAll('label') || [])].map((l) => ({
      text: l.textContent?.trim().slice(0, 40),
      h: Math.round(l.getBoundingClientRect().height),
      cls: l.className.slice(0, 60),
    }))
    const inputs = [...(dlg?.querySelectorAll('input:not([type=hidden]), textarea, button[role=combobox]') || [])].map((el) => ({
      tag: el.tagName,
      h: Math.round(el.getBoundingClientRect().height),
      ph: el.getAttribute('placeholder')?.slice(0, 30) || el.getAttribute('role') || el.type,
    }))
    const blocks = [...(dlg?.querySelectorAll(':scope > *') || [])].map((el) => ({
      cls: el.className?.slice(0, 50),
      h: Math.round(el.getBoundingClientRect().height),
    }))
    return {
      dialog: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      scrollH: dlg?.scrollHeight,
      labelCount: labels.length,
      labels: labels.slice(0, 20),
      inputs: inputs.slice(0, 20),
      blocks,
      footer: dlg?.querySelector('footer, [class*="SheetFooter"]')?.className?.slice(0, 80),
    }
  })
  console.log(label, JSON.stringify(data, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
