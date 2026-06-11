import { chromium } from 'playwright'

const email = 'admin@example.com'
const pass = 'your-password'

async function probe(base, route) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  if (route !== 'login' && route !== 'register') {
    await p.goto(`${base}/#/login`, { waitUntil: 'networkidle' })
    await p.waitForTimeout(1500)
    await p.locator('input[type="email"], input[placeholder*="邮箱"]').first().fill(email)
    await p.locator('input[type="password"]').first().fill(pass)
    await p.locator('.n-button--primary-type').last().click()
    await p.waitForTimeout(2500)
  }
  await p.goto(`${base}/#/${route}`, { waitUntil: 'networkidle' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.n-card')].map((c) => ({
      title: c.querySelector('.n-card-header__main')?.textContent?.trim(),
      h: Math.round(c.getBoundingClientRect().height),
    }))
    const menu = [...document.querySelectorAll('.n-menu-item-content')].map((m) => m.textContent?.trim())
    const breadcrumb = document.querySelector('.app-breadcrumb, [class*="breadcrumb"]')?.textContent?.trim()
    return { cards, menuCount: menu.length, menu: menu.slice(0, 12), breadcrumb }
  })
  console.log(base, route, JSON.stringify(info))
  await b.close()
}

for (const route of ['dashboard', 'invite', 'ticket', 'profile']) {
  await probe('http://127.0.0.1:7001', route)
  await probe('http://127.0.0.1:7002', route)
}
