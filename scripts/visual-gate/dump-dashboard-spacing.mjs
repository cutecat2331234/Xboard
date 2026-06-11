#!/usr/bin/env node
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://43.248.77.134:7001'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_admin_locale', 'en-US'))
const page = await ctx.newPage()
await page.goto(`${base}/d7f5c92b#/sign-in`, { waitUntil: 'networkidle' })
await page.locator('input[name="email"], input[type="email"]').first().fill('admin@xboard.local')
await page.locator('input[name="password"]').first().fill('Xboard@2026')
await page.locator('form button').last().click()
await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 }).catch(() => {})
await page.waitForTimeout(3000)
const data = await page.evaluate(() => {
  const pick = (el) => {
    if (!el) return null
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return { cls: String(el.className).slice(0, 80), y: Math.round(r.y), h: Math.round(r.height), pt: s.paddingTop, pb: s.paddingBottom, gap: s.gap }
  }
  const toolbar = document.querySelector('main h1')?.parentElement?.parentElement
  const contentWrap = toolbar?.nextElementSibling
  const grid = document.querySelector('main .grid.gap-6')
  const firstStat = document.querySelector('main .text-2xl.font-bold:not(h1)')
  return {
    toolbar: pick(toolbar),
    contentWrap: pick(contentWrap),
    grid: pick(grid),
    firstStat: pick(firstStat),
    contentWrapHTML: contentWrap?.className,
  }
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
