import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const out = path.dirname(fileURLToPath(import.meta.url))

const email = 'admin@example.com'
const password = 'your-password'
const BOX = { x: 236, y: 60, width: 1044, height: 840 }

async function apiFixtures(base) {
  const login = await fetch(`${base}/api/v2/passport/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json())
  const auth = login.data.auth_data
  const h = { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' }
  const orders = await fetch(`${base}/api/v1/user/order/fetch`, { headers: h }).then((r) => r.json())
  return orders.data?.find((o) => o.status === 0)?.trade_no ?? orders.data?.[0]?.trade_no
}

async function shot(base, tag, tradeNo) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(() => {
    localStorage.setItem('xboard_locale', 'zh-CN')
  })
  await page.goto(`${base}/#/login`)
  await page.locator('input[type="email"], input[placeholder*="邮箱"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"], .n-button--primary-type').last().click()
  await page.waitForFunction(() => !window.location.hash.includes('/login'), { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(2000)
  await page.goto(`${base}/#/order/${tradeNo}`)
  await page.waitForTimeout(4000)
  const text = await page.locator('body').innerText()
  fs.writeFileSync(path.join(out, `debug-${tag}.txt`), text)
  const buf = await page.screenshot({ clip: BOX })
  fs.writeFileSync(path.join(out, `debug-${tag}-crop.png`), buf)
  await browser.close()
  return PNG.sync.read(buf)
}

const tradeNo = await apiFixtures('http://127.0.0.1:7001')
console.log('tradeNo', tradeNo)
const ref = await shot('http://127.0.0.1:7001', '7001', tradeNo)
const cmp = await shot('http://127.0.0.1:7002', '7002', tradeNo)
const diff = new PNG({ width: ref.width, height: ref.height })
const n = pixelmatch(ref.data, cmp.data, diff.data, ref.width, ref.height, { threshold: 0.1 })
const pct = (n / (ref.width * ref.height)) * 100
fs.writeFileSync(path.join(out, 'debug-diff.png'), PNG.sync.write(diff))
console.log('diff%', pct.toFixed(3))
