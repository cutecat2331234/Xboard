#!/usr/bin/env node
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://43.248.77.134:7001'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => {
  localStorage.setItem('xboard_admin_locale', 'en-US')
  localStorage.removeItem('xboard_admin_auth_data')
})
const page = await ctx.newPage()
await page.goto(`${base}/d7f5c92b#/sign-in`, { waitUntil: 'networkidle' })
await page.locator('input[name="email"], input[type="email"]').first().fill('admin@xboard.local')
await page.locator('input[name="password"]').first().fill('Xboard@2026')
await page.locator('form button').last().click()
await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 }).catch(() => {})
await page.waitForTimeout(3000)
const html = await page.evaluate(() => {
  const root = document.querySelector('#root')
  return root?.innerHTML?.slice(0, 6000)
})
console.log(html)
await browser.close()
