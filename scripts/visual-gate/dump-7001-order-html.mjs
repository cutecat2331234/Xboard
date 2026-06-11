import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto('http://43.248.77.134:7001/#/login')
await page.locator('input[type="email"], input[placeholder*="邮箱"]').first().fill('admin@xboard.local')
await page.locator('input[type="password"]').first().fill('Xboard@2026')
await page.locator('button[type="submit"], .n-button--primary-type').last().click()
await page.waitForTimeout(3000)
const tradeNo = await page.evaluate(async () => {
  const h = { Authorization: localStorage.getItem('xboard_auth_data'), Accept: 'application/json' }
  const j = await (await fetch('/api/v1/user/order/fetch', { headers: h })).json()
  return j.data?.find((o) => o.status === 0)?.trade_no ?? j.data?.[0]?.trade_no
})
await page.goto(`http://43.248.77.134:7001/#/order/${tradeNo}`)
await page.waitForTimeout(4000)

const html = await page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find((n) => n.textContent?.trim() === '商品信息')
  let node = el
  for (let i = 0; i < 8 && node; i++) node = node.parentElement
  const main = document.querySelector('.cus-scroll-y') || document.querySelector('article')
  return {
    nCardCount: document.querySelectorAll('.n-card').length,
    snippet: main?.innerHTML?.slice(0, 25000),
    ancestor: el?.parentElement?.parentElement?.outerHTML?.slice(0, 3000),
  }
})

const out = path.dirname(fileURLToPath(import.meta.url))
fs.writeFileSync(path.join(out, 'dump-7001-order.json'), JSON.stringify({ tradeNo, nCardCount: html.nCardCount }, null, 2))
fs.writeFileSync(path.join(out, 'dump-7001-order.html'), html.snippet || '')
fs.writeFileSync(path.join(out, 'dump-7001-order-ancestor.html'), html.ancestor || '')
console.log('nCardCount', html.nCardCount, 'tradeNo', tradeNo)
await browser.close()
