#!/usr/bin/env node
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://127.0.0.1:7001'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => {
  localStorage.setItem('xboard_admin_locale', 'en-US')
  localStorage.setItem('i18nextLng', 'en-US')
  localStorage.removeItem('xboard_admin_auth_data')
})
const page = await ctx.newPage()
await page.goto(`${base}/#/sign-in`, { waitUntil: 'networkidle', timeout: 120000 })
await page.waitForTimeout(2000)
const html = await page.evaluate(() => {
  const form = document.querySelector('form')
  const card = form?.closest('div')
  let el = form
  while (el && el.parentElement) {
    el = el.parentElement
    if (el.className?.includes?.('rounded-xl')) break
  }
  const buttons = [...document.querySelectorAll('form button')].map((b) => ({
    type: b.type,
    text: b.textContent?.trim(),
    cls: b.className,
  }))
  return { cardClass: el?.className, cardHTML: el?.outerHTML?.slice(0, 4000), buttons }
})
console.log(JSON.stringify(html, null, 2))
await browser.close()
