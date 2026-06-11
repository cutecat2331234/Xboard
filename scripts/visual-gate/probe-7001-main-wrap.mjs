import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()
await p.goto('http://43.248.77.134:7001/#/login')
await p.waitForTimeout(2000)
await p.locator('input[placeholder*="邮箱"], input[type="email"]').first().fill(email)
await p.locator('input[type="password"]').first().fill(pass)
await p.locator('.n-button--primary-type').last().click()
await p.waitForTimeout(3000)
await p.goto('http://43.248.77.134:7001/#/dashboard')
await p.waitForTimeout(3000)
const info = await p.evaluate(() => {
  const sub = [...document.querySelectorAll('.n-card')].find((c) => c.textContent?.includes('我的订阅'))
  let el = sub?.parentElement
  const chain = []
  while (el && chain.length < 8) {
    const r = el.getBoundingClientRect()
    chain.push({
      tag: el.tagName,
      cls: el.className?.slice?.(0, 80),
      y: Math.round(r.y),
      pad: getComputedStyle(el).padding,
    })
    el = el.parentElement
  }
  return chain
})
console.log(JSON.stringify(info, null, 2))
await b.close()
