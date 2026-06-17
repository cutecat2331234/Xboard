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
    const header = dlg?.querySelector('.border-b')
    const title = dlg?.querySelector('[class*="DialogTitle"], h2')
    const desc = header?.querySelector('p')
    const typeSelect = header?.querySelector('[role=combobox], button[role=combobox]')
    return {
      headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
      headerPad: header ? getComputedStyle(header).padding : null,
      titleH: title ? Math.round(title.getBoundingClientRect().height) : null,
      descH: desc ? Math.round(desc.getBoundingClientRect().height) : null,
      descMt: desc ? getComputedStyle(desc).marginTop : null,
      typeSelectH: typeSelect ? Math.round(typeSelect.getBoundingClientRect().height) : null,
      headerHtml: header?.innerHTML?.slice(0, 400),
    }
  })
  console.log(label, JSON.stringify(data, null, 2))
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
