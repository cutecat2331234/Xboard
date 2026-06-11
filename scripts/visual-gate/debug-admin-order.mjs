import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const out = path.dirname(fileURLToPath(import.meta.url))
const securePath = ''

async function shot(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(() => {
    localStorage.setItem('xboard_admin_locale', 'en-US')
    localStorage.setItem('i18nextLng', 'en-US')
  })
  await page.goto(`${base}/${securePath}#/sign-in`)
  await page.locator('input[type="email"], input[name="email"]').first().fill('admin@example.com')
  await page.locator('input[type="password"]').first().fill('your-password')
  await page.locator('button[type="submit"], form button').last().click()
  await page.waitForTimeout(3000)
  await page.goto(`${base}/${securePath}#/finance/order`)
  await page.waitForTimeout(5000)
  const headers = await page.locator('thead th').allTextContents()
  const rows = await page.locator('tbody tr').allTextContents()
  const text = await page.locator('main, .shell-main, body').first().innerText()
  fs.writeFileSync(path.join(out, `debug-admin-order-${tag}.json`), JSON.stringify({ headers, rowCount: rows.length, rows: rows.slice(0, 5) }, null, 2))
  fs.writeFileSync(path.join(out, `debug-admin-order-${tag}.txt`), text.slice(0, 3000))
  const buf = await page.screenshot({ fullPage: true })
  fs.writeFileSync(path.join(out, `debug-admin-order-${tag}.png`), buf)
  await browser.close()
  return PNG.sync.read(buf)
}

const ref = await shot('http://127.0.0.1:7001', '7001')
const cmp = await shot('http://127.0.0.1:7002', '7002')
const diff = new PNG({ width: ref.width, height: ref.height })
const h = Math.min(ref.height, cmp.height)
const w = Math.min(ref.width, cmp.width)
const n = pixelmatch(ref.data, cmp.data, diff.data, w, h, { threshold: 0.15 })
console.log('diff%', ((n / (w * h)) * 100).toFixed(3))
fs.writeFileSync(path.join(out, 'debug-admin-order-diff.png'), PNG.sync.write(diff))
