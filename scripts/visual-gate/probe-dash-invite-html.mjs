import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

async function login(p) {
  await p.goto('http://43.248.77.134:7001/#/login', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2000)
  await p.locator('input[placeholder*="邮箱"], input[type="text"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
}

async function probe(route, sel) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await login(p)
  for (const base of ['http://43.248.77.134:7001', 'http://43.248.77.134:7002']) {
    await p.goto(`${base}/#${route}`, { waitUntil: 'networkidle' }).catch(() => {})
    await p.waitForTimeout(2500)
    const html = await p.evaluate((s) => {
      const el = document.querySelector(s)
      return el ? el.outerHTML.slice(0, 3500) : 'NOT FOUND'
    }, sel)
    console.log('\n===', base, route, '===')
    console.log(html)
  }
  await b.close()
}

await probe('/dashboard', '.shell-main, .app-main')
await probe('/invite', '.invite-income-card, .n-card:last-of-type')
