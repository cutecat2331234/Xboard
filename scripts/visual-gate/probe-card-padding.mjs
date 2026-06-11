import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

async function probe(base, route) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  if (route !== 'login') {
    await p.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(2000)
    await p.locator('input[placeholder*="邮箱"]').first().fill(email)
    await p.locator('input[type="password"]').first().fill(pass)
    await p.locator('.n-button--primary-type').last().click()
    await p.waitForTimeout(3000)
  }
  await p.goto(`${base}/#/${route}`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate((routeName) => {
    const cards = [...document.querySelectorAll('.n-card')].filter((c) => {
      const r = c.getBoundingClientRect()
      return r.width > 200 && r.height > 50
    })
    return cards.map((c, i) => {
      const content = c.querySelector('.n-card__content, .n-card-content')
      const header = c.querySelector('.n-card__header, .n-card-header')
      return {
        i,
        title: header?.textContent?.trim()?.slice(0, 20) || null,
        cardH: Math.round(c.getBoundingClientRect().height),
        headerH: header ? Math.round(header.getBoundingClientRect().height) : 0,
        contentH: content ? Math.round(content.getBoundingClientRect().height) : 0,
        contentPad: content ? getComputedStyle(content).padding : null,
        headerPad: header ? getComputedStyle(header).padding : null,
      }
    })
  }, route)
  console.log(base, route, JSON.stringify(info))
  await b.close()
}

for (const route of ['login', 'dashboard', 'traffic', 'ticket', 'profile', 'invite']) {
  await probe('http://43.248.77.134:7001', route)
  await probe('http://43.248.77.134:7002', route)
}
