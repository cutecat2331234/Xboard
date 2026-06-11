import { chromium } from 'playwright'

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()
await p.goto('http://43.248.77.134:7001/#/login', { waitUntil: 'networkidle', timeout: 120000 })
await p.waitForTimeout(2000)
const html = await p.evaluate(() => {
  const content = document.querySelector('.n-card__content')
  return content?.innerHTML?.slice(-1200)
})
console.log(html)
await b.close()
