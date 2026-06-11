#!/usr/bin/env node
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://127.0.0.1:7001'
const browser = await chromium.launch()
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
await page.waitForTimeout(3000)
const data = await page.evaluate(() => {
  const pick = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { y: Math.round(r.y), h: Math.round(r.height), cls: String(el.className).slice(0, 60) }
  }
  const wrapper = document.querySelector('.recharts-wrapper')?.closest('.rounded-xl')
  const header = wrapper?.querySelector('[class*="CardHeader"], .p-6')?.parentElement
  return {
    card: pick(wrapper),
    header: pick(wrapper?.firstElementChild),
    summary: pick(wrapper?.querySelector('.mb-4')),
    chart: pick(document.querySelector('.recharts-wrapper')),
    headerHTML: wrapper?.firstElementChild?.outerHTML?.slice(0, 2000),
  }
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
