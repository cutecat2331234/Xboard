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
  await p.goto(`${base}/#/dashboard`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const card = [...document.querySelectorAll('.n-card')].find((c) => c.textContent?.includes('我的订阅'))
    const label = card?.querySelector('.text-gray-500, .subscribe-label')
    const plus = card?.querySelector('svg')
    return {
      cardH: Math.round(card?.getBoundingClientRect().height ?? 0),
      labelFs: label ? getComputedStyle(label).fontSize : null,
      labelLh: label ? getComputedStyle(label).lineHeight : null,
      plusFs: plus ? getComputedStyle(plus).fontSize : null,
      plusColor: plus ? getComputedStyle(plus).color : null,
    }
  })
  console.log(base, JSON.stringify(info))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
