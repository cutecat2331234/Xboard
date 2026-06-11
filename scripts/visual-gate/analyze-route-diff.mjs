#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { chromium } from 'playwright'

const route = process.argv[2] || 'dashboard'
const refBase = 'http://127.0.0.1:7001'
const cmpBase = 'http://127.0.0.1:7002'
const email = 'admin@example.com'
const pass = 'your-password'
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'output', 'analyze')

async function login(page, base) {
  await page.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  await page.locator('input[placeholder*="邮箱"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(pass)
  await page.locator('.n-button--primary-type').last().click()
  await page.waitForTimeout(3000)
}

async function shot(base) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  if (route !== 'login') await login(p, base)
  await p.goto(`${base}/#/${route}`, { waitUntil: 'networkidle' }).catch(() => {})
  await p.waitForTimeout(2500)
  const buf = await p.screenshot()
  await b.close()
  return PNG.sync.read(buf)
}

fs.mkdirSync(outDir, { recursive: true })
const a = await shot(refBase)
const b = await shot(cmpBase)
const w = Math.min(a.width, b.width)
const h = Math.min(a.height, b.height)
const imgA = new PNG({ width: w, height: h })
const imgB = new PNG({ width: w, height: h })
const diff = new PNG({ width: w, height: h })
PNG.bitblt(a, imgA, 0, 0, w, h, 0, 0)
PNG.bitblt(b, imgB, 0, 0, w, h, 0, 0)
const n = pixelmatch(imgA.data, imgB.data, diff.data, w, h, { threshold: 0.15, includeAA: false })
fs.writeFileSync(path.join(outDir, `${route}-diff.png`), PNG.sync.write(diff))
fs.writeFileSync(path.join(outDir, `${route}-ref.png`), PNG.sync.write(imgA))
fs.writeFileSync(path.join(outDir, `${route}-cmp.png`), PNG.sync.write(imgB))

const bands = [
  { name: 'header', y0: 0, y1: 56 },
  { name: 'sider', x0: 0, x1: 220, y0: 56, y1: h },
  { name: 'main', x0: 220, x1: w, y0: 56, y1: h },
]
for (const band of bands) {
  let bandDiff = 0
  let bandTotal = 0
  for (let y = band.y0 ?? 0; y < (band.y1 ?? h); y++) {
    for (let x = band.x0 ?? 0; x < (band.x1 ?? w); x++) {
      const i = (w * y + x) * 4
      bandTotal++
      if (diff.data[i] || diff.data[i + 1] || diff.data[i + 2]) bandDiff++
    }
  }
  console.log(`${band.name}: ${((bandDiff / bandTotal) * 100).toFixed(3)}% (${bandDiff}/${bandTotal})`)
}
console.log(`total: ${((n / (w * h)) * 100).toFixed(3)}%`)
console.log(`saved: ${outDir}`)
