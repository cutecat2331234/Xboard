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
const html = await p.evaluate(() => document.querySelector('header')?.outerHTML?.slice(0, 2500))
console.log(html)
await b.close()
