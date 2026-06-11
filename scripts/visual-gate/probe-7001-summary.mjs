import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)

const email = 'admin@xboard.local'
const password = 'Xboard@2026'
const tradeNo = process.argv[2]

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.goto('http://43.248.77.134:7001/#/login', { waitUntil: 'networkidle' })
await p.locator('input[placeholder*="邮箱"]').first().fill(email)
await p.locator('input[type="password"]').first().fill(password)
await p.locator('.n-button--primary-type').last().click()
await p.waitForTimeout(2000)
await p.goto(`http://43.248.77.134:7001/#/order/${tradeNo}`, { waitUntil: 'networkidle' })
await p.waitForTimeout(4000)

const d = await p.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find(
    (e) => e.textContent?.includes('订单总额') && e.textContent?.includes('结账') && e.getBoundingClientRect().width > 200,
  )
  if (!el) return { found: false }
  const r = el.getBoundingClientRect()
  const s = getComputedStyle(el)
  return {
    found: true,
    cls: el.className?.slice?.(0, 120),
    x: Math.round(r.x),
    y: Math.round(r.y),
    w: Math.round(r.width),
    h: Math.round(r.height),
    bg: s.backgroundColor,
    text: el.textContent?.slice(0, 80),
  }
})
console.log(JSON.stringify(d, null, 2))
await b.close()
