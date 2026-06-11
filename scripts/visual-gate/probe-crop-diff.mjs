import { chromium } from 'playwright'
import fs from 'node:fs'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const email = 'admin@example.com'
const pass = 'your-password'
const routes = ['knowledge', 'dashboard', 'profile', 'invite']

async function shot(base, route) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2000)
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
  await p.goto(`${base}/#/${route}`, { waitUntil: 'networkidle' }).catch(() => {})
  await p.waitForTimeout(3000)
  if (route === 'dashboard') {
    await p.waitForFunction(() => {
      const card = [...document.querySelectorAll('.n-card')].find((c) => c.textContent?.includes('我的订阅'))
      return card && !card.querySelector('.n-skeleton')
    }).catch(() => {})
  }
  if (route === 'invite') {
    await p.waitForSelector('.n-data-table-tbody .n-data-table-tr', { timeout: 30000 }).catch(() => {})
  }
  await p.mouse.move(8, 8)
  const buf = await p.screenshot()
  await b.close()
  return PNG.sync.read(buf)
}

function cropDiff(a, b, x, y, w, h) {
  const out = new PNG({ width: w, height: h })
  const aa = new PNG({ width: w, height: h })
  const bb = new PNG({ width: w, height: h })
  PNG.bitblt(a, aa, x, y, w, h, 0, 0)
  PNG.bitblt(b, bb, x, y, w, h, 0, 0)
  const diff = new PNG({ width: w, height: h })
  const n = pixelmatch(aa.data, bb.data, diff.data, w, h, { threshold: 0.15, includeAA: false })
  return (n / (w * h)) * 100
}

for (const route of routes) {
  const a = await shot('http://127.0.0.1:7001', route)
  const b = await shot('http://127.0.0.1:7002', route)
  const full = cropDiff(a, b, 0, 0, 1280, 900)
  const main = cropDiff(a, b, 236, 60, 1044, 840)
  const sider = cropDiff(a, b, 0, 60, 220, 840)
  console.log(route, { full: full.toFixed(3), main: main.toFixed(3), sider: sider.toFixed(3) })
}
