import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
await p.goto('http://127.0.0.1:7001/#/login', { waitUntil: 'networkidle', timeout: 120000 })
await p.locator('input[placeholder*="邮箱"]').first().fill('admin@example.com')
await p.locator('input[type="password"]').first().fill('your-password')
await p.locator('.n-button--primary-type').last().click()
await p.waitForTimeout(2500)
const tn = await p.evaluate(async () => {
  const h = { Authorization: localStorage.getItem('xboard_auth_data') }
  const j = await fetch('/api/v1/user/order/fetch', { headers: h }).then((r) => r.json())
  return j.data?.find((o) => o.status === 0)?.trade_no
})
await p.goto(`http://127.0.0.1:7001/#/order/${tn}`, { waitUntil: 'networkidle', timeout: 120000 })
await p.waitForSelector('.n-card', { timeout: 45000 })
await p.waitForTimeout(3000)
const d = await p.evaluate(() => {
  const card = document.querySelectorAll('.n-card')[0]
  const cnt = card?.querySelector('.n-card__content, .n-card-content')
  const children = [...(cnt?.children || [])].map((el) => {
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    return {
      cls: String(el.className || el.tagName).slice(0, 60),
      h: Math.round(r.height),
      p: s.padding,
      lh: s.lineHeight,
      fs: s.fontSize,
      display: s.display,
    }
  })
  return {
    cntH: Math.round(cnt?.getBoundingClientRect().height ?? 0),
    cntP: cnt ? getComputedStyle(cnt).padding : null,
    children,
    infoRows: document.querySelectorAll('.info-row').length,
  }
})
console.log(JSON.stringify(d, null, 2))
await b.close()
