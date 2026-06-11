import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

async function probe(base, route) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2000)
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
  await p.goto(`${base}/#/${route}`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.n-card')].filter((c) => c.getBoundingClientRect().width > 200)
    return cards.slice(0, 2).map((c, i) => {
      const header = c.querySelector('.n-card-header, .n-card__header')
      const main = header?.querySelector('.n-card-header__main, .n-card__header__main')
      const extra = header?.querySelector('.n-card-header__extra, .n-card__header__extra')
      const hs = header ? getComputedStyle(header) : null
      const ms = main ? getComputedStyle(main) : null
      return {
        i,
        headerH: header ? Math.round(header.getBoundingClientRect().height) : 0,
        pad: hs ? `${hs.paddingTop} ${hs.paddingBottom}` : null,
        lineHeight: ms?.lineHeight,
        fontSize: ms?.fontSize,
        extraH: extra ? Math.round(extra.getBoundingClientRect().height) : 0,
      }
    })
  })
  console.log(base, route, JSON.stringify(info, null, 2))
  await b.close()
}

for (const route of ['dashboard', 'profile', 'invite']) {
  await probe('http://43.248.77.134:7001', route)
  await probe('http://43.248.77.134:7002', route)
}
