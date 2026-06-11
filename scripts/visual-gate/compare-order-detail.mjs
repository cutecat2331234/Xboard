import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const out = path.dirname(fileURLToPath(import.meta.url))

async function dump(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(`${base}/#/login`)
  await page.locator('input[type="email"], input[placeholder*="邮箱"]').first().fill('admin@xboard.local')
  await page.locator('input[type="password"]').first().fill('Xboard@2026')
  await page.locator('button[type="submit"], .n-button--primary-type').last().click()
  await page.waitForTimeout(2500)
  const tradeNo = await page.evaluate(async () => {
    const h = { Authorization: localStorage.getItem('xboard_auth_data'), Accept: 'application/json' }
    const j = await (await fetch('/api/v1/user/order/fetch', { headers: h })).json()
    return j.data?.find((o) => o.status === 0)?.trade_no ?? j.data?.[0]?.trade_no
  })
  await page.goto(`${base}/#/order/${tradeNo}`)
  await page.waitForTimeout(4000)
  await page.screenshot({
    path: path.join(out, `order-detail-${tag}-crop.png`),
    clip: { x: 236, y: 60, width: 1044, height: 840 },
  })
  const html = await page.evaluate(() => {
    const el = document.querySelector('.n-layout-scroll-container') || document.querySelector('main') || document.querySelector('#app')
    return el?.innerHTML?.slice(0, 12000) ?? ''
  })
  fs.writeFileSync(path.join(out, `order-detail-${tag}.html`), html)
  console.log(tag, tradeNo, html.length)
  await browser.close()
}

await dump('http://43.248.77.134:7001', '7001')
await dump('http://43.248.77.134:7002', '7002')
