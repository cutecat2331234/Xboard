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
await p.goto('http://127.0.0.1:7001/#/dashboard', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2500)
const info = await p.evaluate(() => {
  const shortcuts = [...document.querySelectorAll('.shortcut-item, li')].map((l) => l.innerText?.trim()).filter(Boolean)
  const cardHeaders = [...document.querySelectorAll('.n-card-header__main')].map((h) => h.textContent?.trim())
  const subscribe = document.querySelector('.subscribe-empty, [class*="subscribe"]')?.innerText?.trim()
  return { cardHeaders, subscribe, bodySnippet: document.body.innerText.slice(0, 600) }
})
console.log(JSON.stringify(info, null, 2))
await b.close()
