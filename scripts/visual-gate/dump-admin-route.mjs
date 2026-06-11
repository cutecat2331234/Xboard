#!/usr/bin/env node
import { chromium } from 'playwright'

const route = process.argv[2] || 'config/plugin'
const base = process.argv[3] || 'http://43.248.77.134:7001'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => {
  localStorage.setItem('xboard_admin_locale', 'en-US')
  localStorage.setItem('i18nextLng', 'en-US')
})
const page = await ctx.newPage()
await page.goto(`${base}/d7f5c92b#/sign-in`, { waitUntil: 'networkidle', timeout: 120000 })
await page.locator('input[name="email"], input[type="email"]').first().fill('admin@xboard.local')
await page.locator('input[name="password"]').first().fill('Xboard@2026')
await page.locator('button[type="submit"], form button').last().click()
await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 })
await page.waitForTimeout(2000)
await page.goto(`${base}/d7f5c92b#/${route}`, { waitUntil: 'networkidle', timeout: 120000 })
await page.waitForTimeout(2500)
const data = await page.evaluate(() => {
  const content = document.querySelector('main .flex-1.overflow-hidden') || document.querySelector('main .flex-1')
  return {
    url: location.href,
    h1: document.querySelector('h1')?.textContent?.trim(),
    hasTable: Boolean(document.querySelector('table')),
    hasTabs: Boolean(document.querySelector('[role="tablist"]')),
    contentLen: content?.innerHTML?.length ?? 0,
    snippet: content?.innerHTML?.slice(0, 1500),
  }
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
