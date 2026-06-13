import { chromium } from 'playwright'

const REF = 'http://127.0.0.1:7001'
const CMP = 'http://127.0.0.1:7002'
const SEC = ''

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.removeItem('xboard_admin_auth_data')
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
  })
  await page.reload()
  await page.waitForTimeout(1500)
  await page.locator('input[type=text]').first().fill('admin@example.com')
  await page.locator('input[type=password]').first().fill('your-password')
  await page.locator('form button').last().click()
  await page.waitForFunction(() => !location.hash.includes('sign-in'))
}

async function probe(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/`)
  await page.waitForTimeout(4000)
  const data = await page.evaluate(() => ({
    hasUpdateNotice: !!document.querySelector('[class*="SystemUpdate"], [role=alert]'),
    alertHtml: document.querySelector('[role=alert]')?.outerHTML?.slice(0, 300),
    alertH: document.querySelector('[role=alert]')?.getBoundingClientRect().height,
    mainGap: document.querySelector('.grid.gap-6')?.className,
  }))
  console.log(tag, data)
  await browser.close()
}

await probe(REF, '7001')
await probe(CMP, '7002')
