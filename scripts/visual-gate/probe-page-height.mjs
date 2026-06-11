import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

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
  const info = await p.evaluate(() => ({
    scrollH: document.documentElement.scrollHeight,
    bodyH: document.body.scrollHeight,
    appH: document.querySelector('#app')?.scrollHeight,
  }))
  const shot = await p.screenshot({ fullPage: true })
  console.log(base, route, JSON.stringify(info), 'pngH', shot.length)
  await b.close()
}

for (const r of ['invite', 'dashboard']) {
  await probe('http://43.248.77.134:7001', r)
  await probe('http://43.248.77.134:7002', r)
}
