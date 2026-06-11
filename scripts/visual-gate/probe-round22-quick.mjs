import { chromium } from 'playwright'

const CMP = 'http://43.248.77.134:7002'
const REF = 'http://43.248.77.134:7001'
const SEC = 'd7f5c92b'

const ROUTES = [
  ['config-subscribe-template', '#/config/system/subscribe-template'],
  ['config-email', '#/config/system/email'],
  ['config-safe', '#/config/system/safe'],
  ['config-subscribe', '#/config/system/subscribe'],
  ['config-telegram', '#/config/system/telegram'],
  ['ticket', '#/user/ticket'],
  ['dashboard', '#/'],
  ['order', '#/finance/order'],
]

async function login(page, base) {
  await page.goto(`${base}/${SEC}#/sign-in`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.evaluate(() => {
    localStorage.setItem('xboard_admin_locale', 'zh-CN')
    localStorage.setItem('i18nextLng', 'zh-CN')
  })
  await page.reload({ waitUntil: 'networkidle', timeout: 120000 }).catch(() => {})
  if (page.url().includes('sign-in')) {
    await page.locator('input#email, input[name="email"]').first().fill('admin@xboard.local')
    await page.locator('input#password, input[type="password"]').first().fill('Xboard@2026')
    await page.locator('button[type="submit"], form button').last().click()
    await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 30000 }).catch(() => {})
  }
  await page.waitForTimeout(2000)
}

async function probeBase(base, label) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  await login(page, base)
  console.log(`=== ${label} ===`)
  for (const [id, hash] of ROUTES) {
    await page.goto(`${base}/${SEC}${hash}`, { waitUntil: 'networkidle', timeout: 120000 })
    await page.waitForTimeout(2500)
    const m = await page.evaluate(() => ({
      monaco: document.querySelectorAll('.monaco-editor').length,
      tabs: document.querySelectorAll('[role=tablist] [role=tab]').length,
      asideLucide: document.querySelectorAll('aside .lucide').length,
      asideTabler: document.querySelectorAll('aside .tabler-icon').length,
      tables: document.querySelectorAll('table').length,
    }))
    console.log(id, JSON.stringify(m))
  }
  await browser.close()
}

await probeBase(REF, '7001')
await probeBase(CMP, '7002')
