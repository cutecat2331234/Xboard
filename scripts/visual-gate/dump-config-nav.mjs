#!/usr/bin/env node
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://43.248.77.134:7001'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => {
  localStorage.setItem('xboard_admin_locale', 'en-US')
  localStorage.setItem('i18nextLng', 'en-US')
})
const page = await ctx.newPage()
await page.goto(`${base}/d7f5c92b#/sign-in`, { waitUntil: 'networkidle', timeout: 120000 })
await page.locator('input[type="email"]').first().fill('admin@xboard.local')
await page.locator('input[name="password"]').first().fill('Xboard@2026')
await page.locator('button[type="submit"]').last().click()
await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 })
await page.goto(`${base}/d7f5c92b#/config/system`, { waitUntil: 'networkidle', timeout: 120000 })
await page.waitForTimeout(2500)
const data = await page.evaluate(() => {
  const aside = document.querySelector('aside')
  const navBtns = aside
    ? [...aside.querySelectorAll('button')].map((b) => b.textContent?.replace(/\s+/g, ' ').trim())
    : []
  const main = document.querySelector('main .flex-1.overflow-hidden') || document.querySelector('main')
  return { navBtns, outerHTML: main?.innerHTML?.slice(0, 4000) }
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
