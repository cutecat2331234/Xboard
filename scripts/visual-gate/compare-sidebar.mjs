#!/usr/bin/env node
import { chromium } from 'playwright'

const bases = ['http://43.248.77.134:7001', 'http://43.248.77.134:7002']
const browser = await chromium.launch()
for (const base of bases) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => {
    localStorage.setItem('xboard_admin_locale', 'en-US')
    localStorage.setItem('i18nextLng', 'en-US')
  })
  const page = await ctx.newPage()
  await page.goto(`${base}/d7f5c92b#/sign-in`, { waitUntil: 'networkidle' })
  await page.locator('input[name="email"], input[type="email"]').first().fill('admin@xboard.local')
  await page.locator('input[name="password"]').first().fill('Xboard@2026')
  await page.locator('form button').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(2500)
  const data = await page.evaluate(() => {
    const links = [...document.querySelectorAll('aside nav a, aside nav button')].slice(0, 8).map((el) => {
      const r = el.getBoundingClientRect()
      return { text: el.textContent?.trim().slice(0, 30), y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width) }
    })
    const chart = document.querySelector('.recharts-wrapper')?.getBoundingClientRect()
    return { links, chart: chart ? { y: Math.round(chart.y), h: Math.round(chart.height), w: Math.round(chart.width) } : null }
  })
  console.log('===', base, '===')
  console.log(JSON.stringify(data, null, 2))
  await ctx.close()
}
await browser.close()
