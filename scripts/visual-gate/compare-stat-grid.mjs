#!/usr/bin/env node
import { chromium } from 'playwright'

const bases = ['http://127.0.0.1:7001', 'http://127.0.0.1:7002']
const browser = await chromium.launch()
for (const base of bases) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => {
    localStorage.setItem('xboard_admin_locale', 'en-US')
    localStorage.setItem('i18nextLng', 'en-US')
  })
  const page = await ctx.newPage()
  await page.goto(`${base}/#/sign-in`, { waitUntil: 'networkidle' })
  await page.locator('input[name="email"], input[type="email"]').first().fill('admin@example.com')
  await page.locator('input[name="password"]').first().fill('your-password')
  await page.locator('form button').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(2500)
  const data = await page.evaluate(() => {
    const grids = [...document.querySelectorAll('main .grid.gap-4')]
    const statCards = [...document.querySelectorAll('main .rounded-xl.border.bg-card')].slice(0, 8)
    return {
      grids: grids.map((g) => {
        const r = g.getBoundingClientRect()
        return { y: Math.round(r.y), h: Math.round(r.height), cls: String(g.className).slice(0, 40) }
      }),
      statCards: statCards.map((c) => {
        const r = c.getBoundingClientRect()
        return { y: Math.round(r.y), h: Math.round(r.height) }
      }),
    }
  })
  console.log('===', base, '===')
  console.log(JSON.stringify(data, null, 2))
  await ctx.close()
}
await browser.close()
