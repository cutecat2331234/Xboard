#!/usr/bin/env node
import { chromium } from 'playwright'

const route = process.argv[2] || 'plugin'
const base = process.argv[3] || 'http://43.248.77.134:7001'
const browser = await chromium.launch()
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
const pathPart = route.replace(/_/g, '/')
await page.goto(`${base}/d7f5c92b#/${pathPart}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
const html = await page.evaluate(() => {
  const pick = (sel) => document.querySelector(sel)?.outerHTML?.slice(0, 2000)
  return {
    url: location.href,
    h1: document.querySelector('h1')?.textContent,
    content: pick('main div.flex-1.px-4') || pick('main') || document.body.innerHTML.slice(0, 2000),
  }
})
console.log(JSON.stringify(html, null, 2))
await browser.close()
