import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()
await p.goto('http://43.248.77.134:7001/#/login')
await p.waitForTimeout(2000)
await p.locator('input[placeholder*="邮箱"]').first().fill(email)
await p.locator('input[type="password"]').first().fill(pass)
await p.locator('.n-button--primary-type').last().click()
await p.waitForTimeout(3000)
await p.goto('http://43.248.77.134:7001/#/dashboard')
await p.waitForTimeout(3000)
const info = await p.evaluate(() => {
  const wrap = [...document.querySelectorAll('.mb-1')].find((w) => w.querySelector('.n-card'))
  const sub = wrap?.querySelector('.n-card')
  return {
    wrapHtml: wrap?.innerHTML?.slice(0, 200),
    wrapMt: wrap ? getComputedStyle(wrap).marginTop : null,
    wrapMb: wrap ? getComputedStyle(wrap).marginBottom : null,
    wrapPad: wrap ? getComputedStyle(wrap).padding : null,
    wrapH: wrap ? Math.round(wrap.getBoundingClientRect().height) : null,
    subMt: sub ? getComputedStyle(sub).marginTop : null,
    subY: sub ? Math.round(sub.getBoundingClientRect().y) : null,
    wrapY: wrap ? Math.round(wrap.getBoundingClientRect().y) : null,
    sectionBg: wrap?.closest('section') ? getComputedStyle(wrap.closest('section')).backgroundColor : null,
  }
})
console.log(JSON.stringify(info, null, 2))
await b.close()
