#!/usr/bin/env node
import { chromium } from 'playwright'

const bases = ['http://127.0.0.1:7001', 'http://127.0.0.1:7002']
const email = 'admin@example.com'
const password = 'your-password'

function pick(el) {
  if (!el) return null
  const s = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  return {
    cls: String(el.className || '').slice(0, 80),
    w: Math.round(r.width),
    h: Math.round(r.height),
    x: Math.round(r.x),
    y: Math.round(r.y),
    pl: s.paddingLeft,
    pr: s.paddingRight,
    ml: s.marginLeft,
    fs: s.fontSize,
    lh: s.lineHeight,
    gap: s.gap,
  }
}

const browser = await chromium.launch()
for (const base of bases) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => {
    localStorage.setItem('xboard_admin_locale', 'en-US')
    localStorage.setItem('i18nextLng', 'en-US')
  })
  const page = await ctx.newPage()
  await page.goto(`${base}/#/sign-in`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.locator('input[name="email"], input[type="email"]').first().fill(email)
  await page.locator('input[name="password"], input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"], form button').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('sign-in'), { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(2500)
  const data = await page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        cls: String(el.className || '').slice(0, 80),
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.x),
        y: Math.round(r.y),
        pl: s.paddingLeft,
        pr: s.paddingRight,
        ml: s.marginLeft,
        fs: s.fontSize,
        lh: s.lineHeight,
        gap: s.gap,
      }
    }
    const aside = document.querySelector('aside')
    const main = document.querySelector('main')
    const header = document.querySelector('header')
    const h1 = main?.querySelector('h1')
    const cards = [...document.querySelectorAll('main [class*="rounded"]')].slice(0, 4).map(pick)
    const statValues = [...document.querySelectorAll('main .text-2xl')].slice(0, 4).map(pick)
    return {
      aside: pick(aside),
      main: pick(main),
      header: pick(header),
      h1: pick(h1),
      cards,
      statValues,
      scrollH: document.documentElement.scrollHeight,
    }
  })
  console.log('===', base, '===')
  console.log(JSON.stringify(data, null, 2))
  await ctx.close()
}
await browser.close()
