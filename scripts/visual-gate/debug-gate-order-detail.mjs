import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const refBase = 'http://43.248.77.134:7001'
const cmpBase = 'http://43.248.77.134:7002'
const BOX = { x: 236, y: 60, w: 1044, h: 840 }
const email = 'admin@xboard.local'
const password = 'Xboard@2026'
const securePath = 'd7f5c92b'

async function passportLogin(base) {
  const res = await fetch(`${base}/api/v1/passport/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  return json.data?.auth_data
}

async function ensureFixture() {
  const adminAuth = await fetch(`${refBase}/api/v2/passport/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json()).then((j) => j.data?.auth_data)
  const adminHdr = { Authorization: adminAuth, Accept: 'application/json', 'Content-Type': 'application/json' }
  const adminPrefix = `${refBase}/api/v2/${securePath}`
  const plans = await fetch(`${adminPrefix}/plan/fetch`, { headers: adminHdr }).then((r) => r.json())
  const planId = plans.data?.[0]?.id
  const userAuth = await passportLogin(refBase)
  const userHdr = { Authorization: userAuth, Accept: 'application/json', 'Content-Type': 'application/json' }
  const orders = await fetch(`${refBase}/api/v1/user/order/fetch`, { headers: userHdr }).then((r) => r.json())
  const pending = orders.data?.find((o) => o.status === 0)
  if (pending?.trade_no) {
    await fetch(`${refBase}/api/v1/user/order/cancel`, {
      method: 'POST',
      headers: userHdr,
      body: JSON.stringify({ trade_no: pending.trade_no }),
    })
  }
  const save = await fetch(`${refBase}/api/v1/user/order/save`, {
    method: 'POST',
    headers: userHdr,
    body: JSON.stringify({ plan_id: planId, period: 'month_price' }),
  }).then((r) => r.json())
  return save.data
}

function crop(img, box) {
  const out = new PNG({ width: box.w, height: box.h })
  PNG.bitblt(img, out, box.x, box.y, box.w, box.h, 0, 0)
  return out
}

async function shot(base, tradeNo) {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => {
    localStorage.setItem('xboard_locale', 'zh-CN')
    localStorage.removeItem('xboard_auth_data')
  })
  const page = await ctx.newPage()
  await page.goto(`${base}/#/login`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.evaluate(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  await page.reload({ waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1500)
  await page.locator('input[type="email"], input[placeholder*="邮箱"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"], .n-button--primary-type').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('/login'), { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(2000)
  await page.goto(`${base}/#/order/${tradeNo}`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForSelector('.order-detail-page, .summary-panel', { timeout: 45000 }).catch(() => {})
  await page.waitForTimeout(3000)
  const text = await page.locator('body').innerText()
  const full = PNG.sync.read(await page.screenshot({ fullPage: false }))
  await browser.close()
  return { full, main: crop(full, BOX), text: text.slice(0, 800) }
}

const tradeNo = await ensureFixture()
console.log('tradeNo', tradeNo)
const ref = await shot(refBase, tradeNo)
const cmp = await shot(cmpBase, tradeNo)
const out = path.dirname(fileURLToPath(import.meta.url))
fs.writeFileSync(path.join(out, 'gate-debug-ref.txt'), ref.text)
fs.writeFileSync(path.join(out, 'gate-debug-cmp.txt'), cmp.text)
fs.writeFileSync(path.join(out, 'gate-debug-ref-main.png'), PNG.sync.write(ref.main))
fs.writeFileSync(path.join(out, 'gate-debug-cmp-main.png'), PNG.sync.write(cmp.main))
const diff = new PNG({ width: BOX.w, height: BOX.h })
const n = pixelmatch(ref.main.data, cmp.main.data, diff.data, BOX.w, BOX.h, { threshold: 0.15, includeAA: false })
console.log('main diff%', ((n / (BOX.w * BOX.h)) * 100).toFixed(3))
fs.writeFileSync(path.join(out, 'gate-debug-diff.png'), PNG.sync.write(diff))
