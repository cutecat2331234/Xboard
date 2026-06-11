import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'
const routes = ['dashboard', 'invite', 'profile', 'knowledge']

async function probe(base, route) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`)
  await p.waitForTimeout(2000)
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
  await p.goto(`${base}/#/${route}`)
  await p.waitForTimeout(3000)
  const r = await p.evaluate(() => {
    const card = document.querySelector('.n-card')
    return card ? getComputedStyle(card).borderRadius : null
  })
  console.log(base, route, r)
  await b.close()
}

for (const route of routes) {
  await probe('http://43.248.77.134:7001', route)
  await probe('http://43.248.77.134:7002', route)
}
