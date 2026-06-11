#!/usr/bin/env node
import { chromium } from 'playwright'
import fs from 'node:fs'

const route = process.argv[2] || 'config/plugin'
const base = process.argv[3] || 'http://127.0.0.1:7001'
const out = process.argv[4] || `output-${route.replace(/\//g, '-')}.html`

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
await page.goto(`${base}/#/${route}`, { waitUntil: 'networkidle', timeout: 120000 })
await page.waitForTimeout(2500)
const html = await page.evaluate(() => {
  const content = document.querySelector('main .flex-1.overflow-hidden') || document.querySelector('main .flex-1')
  return content?.innerHTML ?? ''
})
fs.writeFileSync(out, html)
console.log(`wrote ${out} len=${html.length}`)
await browser.close()
