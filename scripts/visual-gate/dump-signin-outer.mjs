#!/usr/bin/env node
import { chromium } from 'playwright'

const base = process.argv[2] || 'http://127.0.0.1:7001'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => {
  localStorage.setItem('xboard_admin_locale', 'en-US')
  localStorage.removeItem('xboard_admin_auth_data')
})
const page = await ctx.newPage()
await page.goto(`${base}/#/sign-in`, { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const data = await page.evaluate(() => {
  const root = document.querySelector('#root')
  const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary')
  const submit = document.querySelector('form button[type=submit], form button:last-of-type')
  return {
    primary,
    submitBg: submit ? getComputedStyle(submit).backgroundColor : null,
    outerHTML: root?.innerHTML?.slice(0, 2000),
  }
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
