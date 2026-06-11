import { chromium } from 'playwright'

const email = 'admin@example.com'
const pass = 'your-password'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()
await p.goto('http://127.0.0.1:7001/#/login', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2000)
await p.locator('input[placeholder*="邮箱"]').first().fill(email)
await p.locator('input[type="password"]').first().fill(pass)
await p.locator('.n-button--primary-type').last().click()
await p.waitForTimeout(3000)
const info = await p.evaluate(() => {
  const groups = [...document.querySelectorAll('.n-menu-item-group-title')].map((g) => g.textContent?.trim())
  const items = [...document.querySelectorAll('.n-menu-item-content')].map((m) => ({
    text: m.textContent?.trim(),
    selected: m.classList.contains('n-menu-item-content--selected'),
  }))
  const brand = document.querySelector('.n-layout-sider')?.innerText?.split('\n')[0]
  return { groups, items, brand }
})
console.log(JSON.stringify(info, null, 2))
await b.close()
