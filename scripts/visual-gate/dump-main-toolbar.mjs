#!/usr/bin/env node
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://127.0.0.1:7001'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => {
  localStorage.setItem('xboard_admin_locale', 'en-US')
})
const page = await ctx.newPage()
await page.goto(`${base}/#/sign-in`, { waitUntil: 'networkidle' })
await page.locator('input[name="email"], input[type="email"]').first().fill('admin@example.com')
await page.locator('input[name="password"]').first().fill('your-password')
await page.locator('form button').last().click()
await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 }).catch(() => {})
await page.waitForTimeout(3000)
const data = await page.evaluate(() => {
  const main = document.querySelector('main')
  const parent = main?.parentElement
  const toolbar = document.querySelector('main')?.previousElementSibling
  return {
    mainClass: main?.className,
    parentClass: parent?.className,
    toolbarClass: toolbar?.className,
    toolbarHTML: toolbar?.outerHTML?.slice(0, 2500),
    mainFirstHTML: main?.innerHTML?.slice(0, 2000),
  }
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
