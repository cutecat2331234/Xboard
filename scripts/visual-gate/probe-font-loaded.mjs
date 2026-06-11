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
  await p.goto(`${base}/#/dashboard`, { waitUntil: 'networkidle' }).catch(() => {})
  await p.waitForTimeout(5000)
  await p.evaluate(() => document.fonts.ready)
  const r = await p.evaluate(() => ({
    links: [...document.querySelectorAll('link[href*="font"]')].map((l) => l.href),
    check16: document.fonts.check('16px "Encode Sans Condensed"'),
    check14: document.fonts.check('14px "Encode Sans Condensed"'),
    families: [...document.fonts].map((f) => `${f.family} ${f.status}`),
  }))
  console.log(base, JSON.stringify(r, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
