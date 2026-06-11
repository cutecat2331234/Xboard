import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

async function login(p) {
  await p.goto('http://43.248.77.134:7001/#/login', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2000)
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
}

async function probe(base, route, loggedIn = true) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  if (loggedIn && route !== 'login' && route !== 'register') {
    await p.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded' })
    await p.waitForTimeout(2000)
    await p.locator('input[placeholder*="邮箱"]').first().fill(email)
    await p.locator('input[type="password"]').first().fill(pass)
    await p.locator('.n-button--primary-type').last().click()
    await p.waitForTimeout(3000)
  }
  await p.goto(`${base}/#/${route}`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.n-card')].map((c, i) => ({
      i,
      title: c.querySelector('.n-card-header__main')?.textContent?.trim() || null,
      h: Math.round(c.getBoundingClientRect().height),
    }))
    const loginCard = document.querySelector('.auth-card, .n-card')?.getBoundingClientRect()
    const footer = document.querySelector('.auth-card__footer-bar')?.getBoundingClientRect()
    return {
      cards,
      loginCardH: loginCard ? Math.round(loginCard.height) : null,
      footerH: footer ? Math.round(footer.height) : null,
    }
  })
  console.log(base, route, JSON.stringify(info))
  await b.close()
}

for (const route of ['login', 'dashboard', 'invite', 'traffic', 'ticket', 'profile']) {
  await probe('http://43.248.77.134:7001', route, route !== 'login' && route !== 'register')
  await probe('http://43.248.77.134:7002', route, route !== 'login' && route !== 'register')
}
