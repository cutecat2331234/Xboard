#!/usr/bin/env node
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://127.0.0.1:7001'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_admin_locale', 'en-US'))
const page = await ctx.newPage()
await page.goto(`${base}/#/sign-in`, { waitUntil: 'networkidle' })
await page.locator('input[name="email"], input[type="email"]').first().fill('admin@example.com')
await page.locator('input[name="password"]').first().fill('your-password')
await page.locator('form button').last().click()
await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 }).catch(() => {})
await page.waitForTimeout(3000)
const html = await page.evaluate(() => {
  const grid = document.querySelector('main .grid')
  return grid?.outerHTML?.slice(0, 3000)
})
console.log(html)
await browser.close()
