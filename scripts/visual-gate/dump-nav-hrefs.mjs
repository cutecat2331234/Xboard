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
await page.goto(`${base}/#/sign-in`, { waitUntil: 'networkidle', timeout: 120000 })
await page.locator('input[name="email"], input[type="email"]').first().fill('admin@example.com')
await page.locator('input[name="password"]').first().fill('your-password')
await page.locator('button[type="submit"], form button').last().click()
await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 })
await page.waitForTimeout(2500)
const links = await page.evaluate(() =>
  [...document.querySelectorAll('aside nav a[href]')].map((a) => ({
    href: a.getAttribute('href'),
    text: a.textContent?.trim().slice(0, 40),
  })),
)
console.log(JSON.stringify(links, null, 2))
await browser.close()
