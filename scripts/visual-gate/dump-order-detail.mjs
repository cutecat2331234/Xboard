import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)

const base = process.env.BASE || 'http://127.0.0.1:7001'
const email = 'admin@example.com'
const password = 'your-password'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(`${base}/#/login`)
await page.locator('input[type="email"], input[placeholder*="邮箱"]').first().fill(email)
await page.locator('input[type="password"]').first().fill(password)
await page.locator('button[type="submit"], .n-button--primary-type').last().click()
await page.waitForTimeout(3000)

const tradeNo = await page.evaluate(async () => {
  const headers = { Authorization: localStorage.getItem('xboard_auth_data'), Accept: 'application/json' }
  const res = await fetch('/api/v1/user/order/fetch', { headers })
  const json = await res.json()
  return json.data?.find((o) => o.status === 0)?.trade_no ?? json.data?.[0]?.trade_no
})

await page.goto(`${base}/#/order/${tradeNo}`)
await page.waitForTimeout(5000)
const text = await page.locator('body').innerText()
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'order-detail-7001.txt'), text)
console.log(text)
await browser.close()
