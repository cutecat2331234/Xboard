import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = process.env.SECURE_PATH || ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(1500)
  const pwd = page.locator('input[type=password]')
  if ((await pwd.count()) > 0) {
    await page.locator('input[name=email],input[type=email],input[type=text]').first().fill('admin@example.com')
    await pwd.first().fill('your-password')
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
  await page.waitForTimeout(500)

  const data = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    const r = dlg?.getBoundingClientRect()
    const header = dlg?.querySelector('.border-b')
    const footer = dlg?.querySelector('footer, [class*="DialogFooter"]')
    const scroll = dlg?.querySelector('.overflow-y-auto')
    const labels = dlg?.querySelectorAll('label')
    return {
      dialog: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      header: header ? Math.round(header.getBoundingClientRect().height) : null,
      scroll: scroll ? Math.round(scroll.getBoundingClientRect().height) : null,
      footer: footer ? Math.round(footer.getBoundingClientRect().height) : null,
      labelCount: labels?.length ?? 0,
      emptyLabels: [...(labels || [])].filter((l) => !l.textContent?.trim()).length,
      stackClasses: [...new Set([...(dlg?.querySelectorAll('[class*="xb-stack"]') || [])].map((el) => el.className))],
    }
  })
  console.log(label, JSON.stringify(data, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
