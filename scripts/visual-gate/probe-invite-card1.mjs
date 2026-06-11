import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()
await p.goto('http://43.248.77.134:7001/#/login', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2000)
await p.locator('input[placeholder*="邮箱"]').first().fill(email)
await p.locator('input[type="password"]').first().fill(pass)
await p.locator('.n-button--primary-type').last().click()
await p.waitForTimeout(3000)
await p.goto('http://43.248.77.134:7001/#/invite', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2500)
const text = await p.evaluate(() => document.querySelectorAll('.n-card')[1]?.innerText)
console.log(text)
await b.close()
