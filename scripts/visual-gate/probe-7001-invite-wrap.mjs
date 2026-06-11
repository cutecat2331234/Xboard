import { chromium } from 'playwright'

const email = 'admin@example.com'
const pass = 'your-password'

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()
await p.goto('http://127.0.0.1:7001/#/login')
await p.waitForTimeout(2000)
await p.locator('input[placeholder*="邮箱"]').first().fill(email)
await p.locator('input[type="password"]').first().fill(pass)
await p.locator('.n-button--primary-type').last().click()
await p.waitForTimeout(3000)
await p.goto('http://127.0.0.1:7001/#/invite')
await p.waitForTimeout(4000)
const info = await p.evaluate(() => {
  const section = document.querySelector('section.cus-scroll-y, section')
  const wrap = document.querySelector('.mb-1')
  return {
    sectionCls: section?.className,
    sectionPad: section ? getComputedStyle(section).padding : null,
    wrapFound: Boolean(wrap),
    wrapMb: wrap ? getComputedStyle(wrap).marginBottom : null,
    cards: [...document.querySelectorAll('.n-card')].slice(0, 2).map((c) => ({
      y: Math.round(c.getBoundingClientRect().y),
      h: Math.round(c.getBoundingClientRect().height),
      mt: getComputedStyle(c).marginTop,
    })),
  }
})
console.log(JSON.stringify(info, null, 2))
await b.close()
