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
await p.goto('http://127.0.0.1:7001/#/dashboard')
await p.waitForTimeout(4000)
await p.waitForFunction(() => {
  const card = [...document.querySelectorAll('.n-card')].find((c) => c.textContent?.includes('我的订阅'))
  return card && !card.querySelector('.n-skeleton')
}).catch(() => {})
const info = await p.evaluate(() => {
  const wrap = document.querySelector('.mb-1.md\\:mb-10, .mb-1')
  const children = wrap ? [...wrap.children].map((c) => ({
    tag: c.tagName,
    cls: c.className?.slice(0, 100),
    y: Math.round(c.getBoundingClientRect().y),
    h: Math.round(c.getBoundingClientRect().height),
    text: c.textContent?.slice(0, 40),
  })) : []
  return { children, sectionCls: document.querySelector('section.cus-scroll-y')?.className }
})
console.log(JSON.stringify(info, null, 2))
await b.close()
