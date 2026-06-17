import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)

const email = 'admin@example.com'
const password = 'your-password'
const securePath = process.env.SECURE_PATH || ''
const base = 'http://127.0.0.1:7001'

async function login(v) {
  const r = await fetch(`${base}/api/${v}/passport/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return (await r.json()).data?.auth_data
}

const adminAuth = await login('v2')
const adminHdr = { Authorization: adminAuth, 'Content-Type': 'application/json', Accept: 'application/json' }
const adminPrefix = `${base}/api/v2/${securePath}`
const userAuth = await login('v1')
const userHdr = { Authorization: userAuth, 'Content-Type': 'application/json', Accept: 'application/json' }

const orders = await fetch(`${base}/api/v1/user/order/fetch`, { headers: userHdr }).then((r) => r.json())
const pending = orders.data?.find((o) => o.status === 0)
if (pending) {
  await fetch(`${base}/api/v1/user/order/cancel`, {
    method: 'POST',
    headers: userHdr,
    body: JSON.stringify({ trade_no: pending.trade_no }),
  })
}

const assign = await fetch(`${adminPrefix}/order/assign`, {
  method: 'POST',
  headers: adminHdr,
  body: JSON.stringify({ email, plan_id: 1, period: 'month_price', total_amount: 10000 }),
}).then((r) => r.json())
const tradeNo = assign.data
console.log('tradeNo', tradeNo)

async function snap(port, tag) {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  await p.goto(`http://127.0.0.1:${port}/#/login`, { waitUntil: 'networkidle' })
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(password)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(2000)
  await p.goto(`http://127.0.0.1:${port}/#/order/${tradeNo}`, { waitUntil: 'networkidle' })
  await p.waitForSelector('.n-card', { timeout: 30000 })
  await p.waitForTimeout(4000)
  const d = await p.evaluate(() => {
    const r = (el) => {
      const b = el.getBoundingClientRect()
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
    }
    const cards = [...document.querySelectorAll('.n-card')].map((c, i) => ({
      i,
      title: c.querySelector('.n-card-header__main')?.textContent?.trim(),
      ...r(c),
    }))
    const summary = document.querySelector('.summary-panel, [class*="summary"]')
    const page = document.querySelector('.order-detail-page')
    return {
      cards,
      summary: summary ? r(summary) : null,
      page: page ? r(page) : null,
      hasClose: Boolean(document.body.innerText.includes('关闭订单')),
      hasPay: Boolean(document.body.innerText.includes('支付方式')),
    }
  })
  console.log(tag, JSON.stringify(d, null, 2))
  await b.close()
}

await Promise.all([snap(7001, '7001'), snap(7002, '7002')])
