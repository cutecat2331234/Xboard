import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

async function probe(base) {
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
  await p.goto(`${base}/#/invite`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.n-card')].filter((c) => c.getBoundingClientRect().width > 200)
    return cards.map((c, i) => ({
      i,
      title: c.querySelector('.n-card-header__main')?.textContent?.trim(),
      headerExtra: c.querySelector('.n-card-header__extra, .n-card-header-extra')?.innerHTML?.slice(0, 200),
      headerH: Math.round(c.querySelector('.n-card-header, .n-card__header')?.getBoundingClientRect().height ?? 0),
      cardH: Math.round(c.getBoundingClientRect().height),
    }))
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
