import { chromium } from 'playwright'

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()
await p.goto('http://43.248.77.134:7001/#/login', { waitUntil: 'networkidle', timeout: 120000 })
await p.locator('input[placeholder*="邮箱"]').first().fill('admin@xboard.local')
await p.locator('input[type="password"]').first().fill('Xboard@2026')
await p.locator('.n-button--primary-type').filter({ hasText: /登入/ }).first().click()
await p.waitForTimeout(3000)
await p.goto('http://43.248.77.134:7001/#/profile', { waitUntil: 'networkidle', timeout: 120000 })
await p.waitForTimeout(2000)
const info = await p.evaluate(() => ({
  cards: [...document.querySelectorAll('.n-card')].map((c) => ({
    title: c.querySelector('.n-card-header__main')?.textContent?.trim(),
    text: c.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120),
    btns: [...c.querySelectorAll('button, a')].filter((x) => x.offsetParent).map((x) => x.textContent?.trim()),
  })),
}))
console.log(JSON.stringify(info, null, 2))
await b.close()
