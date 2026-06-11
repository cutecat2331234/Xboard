import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

async function shot(base) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`)
  await p.waitForTimeout(2000)
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
  await p.goto(`${base}/#/invite`)
  await p.waitForTimeout(3000)
  await p.evaluate(() => document.fonts?.ready)
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

const a = await shot('http://43.248.77.134:7001')
const b = await shot('http://43.248.77.134:7002')
const x0 = 236
const w = 1044
for (let y = 60; y < 900; y += 30) {
  const pct = cropDiff(a, b, x0, y, w, 30)
  if (pct > 0.8) console.log(`y=${y}-${y + 30}: ${pct.toFixed(2)}%`)
}
