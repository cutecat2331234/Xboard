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

async function probe(base, label, openFn) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await login(page, base)
  await page.goto(`${base}/${SEC}#/user/manage`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('tbody tr', { timeout: 45000 })
  await openFn(page)
  await page.waitForSelector('[role=dialog]', { timeout: 10000 })
  await page.waitForTimeout(500)

  const data = await page.evaluate(() => {
    const dlg = document.querySelector('[role=dialog]')
    const r = dlg?.getBoundingClientRect()
    const scroll = dlg?.querySelector('.overflow-y-auto')
    const outer = scroll?.firstElementChild
    return {
      dialog: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
      scrollH: scroll ? Math.round(scroll.getBoundingClientRect().height) : null,
      outerCls: outer?.className?.slice(0, 100),
      outerPad: outer ? getComputedStyle(outer).padding : null,
      blocks: [...(scroll?.children || [])].map((el) => ({
        cls: el.className.slice(0, 80),
        h: Math.round(el.getBoundingClientRect().height),
      })),
    }
  })
  console.log(label, JSON.stringify(data, null, 2))
  await browser.close()
}

console.log('=== user-create ===')
await probe(REF, '7001', (p) => p.locator('button:has-text("创建用户")').first().click())
await probe(CMP, '7002', (p) => p.locator('button:has-text("创建用户")').first().click())

console.log('=== plan-add ===')
await probe(REF, '7001', async (p) => {
  await p.goto(`${REF}/${SEC}#/finance/plan`)
  await p.waitForSelector('tbody tr')
  await p.locator('button:has-text("添加套餐")').first().click()
})
await probe(CMP, '7002', async (p) => {
  await p.goto(`${CMP}/${SEC}#/finance/plan`)
  await p.waitForSelector('tbody tr')
  await p.locator('button:has-text("添加套餐")').first().click()
})
