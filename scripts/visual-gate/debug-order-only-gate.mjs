import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const securePath = process.env.SECURE_PATH || ''

async function loginAndShot(base) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(() => {
    localStorage.setItem('xboard_admin_locale', 'en-US')
    localStorage.setItem('i18nextLng', 'en-US')
  })
  await page.goto(`${base}/${securePath}#/sign-in`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@example.com')
  await page.locator('input[type="password"]').first().fill('your-password')
  await page.locator('button[type="submit"], form button').last().click()
  await page.waitForTimeout(4000)
  await page.goto(`${base}/${securePath}#/finance/order`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('table tbody tr', { timeout: 30000 })
  await page.waitForTimeout(2000)
  const buf = await page.screenshot({ fullPage: true })
  await browser.close()
  return PNG.sync.read(buf)
}

const ref = await loginAndShot('http://127.0.0.1:7001')
const cmp = await loginAndShot('http://127.0.0.1:7002')
const w = Math.min(ref.width, cmp.width)
const h = Math.min(ref.height, cmp.height)
const diff = new PNG({ width: w, height: h })
let n = 0
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const ri = (y * ref.width + x) << 2
    const ci = (y * cmp.width + x) << 2
    if (
      pixelmatch(
        Buffer.from([ref.data[ri], ref.data[ri + 1], ref.data[ri + 2], ref.data[ri + 3]]),
        Buffer.from([cmp.data[ci], cmp.data[ci + 1], cmp.data[ci + 2], cmp.data[ci + 3]]),
        null,
        1,
        1,
        { threshold: 0.1 },
      )
    ) {
      const di = (y * w + x) << 2
      diff.data[di] = 255
      diff.data[di + 1] = 0
      diff.data[di + 2] = 0
      diff.data[di + 3] = 255
      n++
    }
  }
}
const pct = (n / (w * h)) * 100
const out = path.dirname(fileURLToPath(import.meta.url))
fs.writeFileSync(path.join(out, 'debug-order-only-diff.png'), PNG.sync.write(diff))
console.log(`order-only diff=${pct.toFixed(3)}% (${n}/${w * h})`)
