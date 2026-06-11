import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const email = 'admin@xboard.local'
const password = 'Xboard@2026'

async function probe(port) {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const base = `http://43.248.77.134:${port}`
  await p.goto(`${base}/#/login`, { waitUntil: 'networkidle', timeout: 120000 })
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(password)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(2500)
  const tn = await p.evaluate(async () => {
    const h = { Authorization: localStorage.getItem('xboard_auth_data') }
    const j = await fetch('/api/v1/user/order/fetch', { headers: h }).then((r) => r.json())
    return j.data?.find((o) => o.status === 0)?.trade_no
  })
  await p.goto(`${base}/#/order/${tn}`, { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(4000)
  const d = await p.evaluate(() => {
    const pick = (el) => {
      if (!el) return null
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        cls: String(el.className || '').slice(0, 80),
        y: Math.round(r.y),
        h: Math.round(r.height),
        m: s.margin,
      }
    }
    const checkout = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('结账'))
    let panel = checkout
    while (panel && getComputedStyle(panel).backgroundColor !== 'rgb(35, 46, 60)') {
      panel = panel.parentElement
    }
    return {
      page: pick(document.querySelector('.order-detail-page')),
      main: pick(document.querySelector('.order-detail-main')),
      aside: pick(document.querySelector('.order-detail-aside')),
      card0: pick(document.querySelectorAll('.n-card')[0]),
      panel: pick(panel),
      checkout: pick(checkout),
    }
  })
  console.log(port, JSON.stringify(d, null, 2))
  await b.close()
}

await probe(7001)
await probe(7002)
