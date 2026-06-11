import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const email = 'admin@example.com'
const pass = 'your-password'

async function shot(base) {
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
  await p.goto(`${base}/#/invite`, { waitUntil: 'networkidle' }).catch(() => {})
  await p.waitForTimeout(3000)
  await p.waitForSelector('.n-data-table-tbody .n-data-table-tr', { timeout: 30000 }).catch(() => {})
  await p.evaluate(() => document.fonts?.ready).catch(() => {})
  await p.mouse.move(8, 8)
  await p.waitForTimeout(2000)
  const buf = await p.screenshot()
  await b.close()
  return PNG.sync.read(buf)
}

function cropDiff(a, b, x, y, w, h) {
  const aa = new PNG({ width: w, height: h })
  const bb = new PNG({ width: w, height: h })
  PNG.bitblt(a, aa, x, y, w, h, 0, 0)
  PNG.bitblt(b, bb, x, y, w, h, 0, 0)
  const diff = new PNG({ width: w, height: h })
  const n = pixelmatch(aa.data, bb.data, diff.data, w, h, { threshold: 0.15, includeAA: false })
  return (n / (w * h)) * 100
}

const a = await shot('http://127.0.0.1:7001')
const b = await shot('http://127.0.0.1:7002')
console.log('full', cropDiff(a, b, 0, 0, 1280, 900).toFixed(3))
console.log('main', cropDiff(a, b, 236, 60, 1044, 840).toFixed(3))
for (let y = 60; y < 900; y += 60) {
  const pct = cropDiff(a, b, 236, y, 1044, 60)
  if (pct > 0.5) console.log(`y=${y}-${y + 60}: ${pct.toFixed(2)}%`)
}
