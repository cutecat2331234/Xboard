import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)
const email = 'admin@example.com'
const password = 'your-password'

async function ensureFixtures(base) {
  const securePath = ''
  const login = async (ver) => {
    const res = await fetch(`${base}/api/${ver}/passport/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const json = await res.json()
    return json.data?.auth_data
  }
  const adminAuth = await login('v2')
  const adminHdr = { Authorization: adminAuth, Accept: 'application/json', 'Content-Type': 'application/json' }
  const adminPrefix = `${base}/api/v2/${securePath}`
  const plans = await fetch(`${adminPrefix}/plan/fetch`, { headers: adminHdr }).then((r) => r.json())
  const planId = plans.data?.[0]?.id
  if (!planId) return ''
  const userAuth = await login('v1')
  const userHdr = { Authorization: userAuth, Accept: 'application/json', 'Content-Type': 'application/json' }
  const orders = await fetch(`${base}/api/v1/user/order/fetch`, { headers: userHdr }).then((r) => r.json())
  const pending = orders.data?.find((o) => o.status === 0)
  if (pending?.trade_no) return pending.trade_no
  const save = await fetch(`${base}/api/v1/user/order/save`, {
    method: 'POST',
    headers: userHdr,
    body: JSON.stringify({ plan_id: planId, period: 'month_price' }),
  }).then((r) => r.json())
  return save.data || ''
}

async function probe(port) {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const base = `http://127.0.0.1:${port}`
  const tradeNo = await ensureFixtures(base)
  await p.goto(`${base}/#/login`, { waitUntil: 'networkidle', timeout: 120000 })
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(password)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(2500)
  await p.goto(`${base}/#/order/${tradeNo}`, { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(4000)
  const d = await p.evaluate(() => {
    const pick = (el) => {
      if (!el) return null
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        m: s.margin,
        p: s.padding,
        bg: s.backgroundColor,
        shadow: s.boxShadow,
        br: s.borderRadius,
        fs: s.fontSize,
        fw: s.fontWeight,
      }
    }
    const cards = [...document.querySelectorAll('.n-card')].map((el, i) => ({
      i,
      title: el.querySelector('.n-card-header__main')?.textContent?.trim(),
      ...pick(el),
      hdr: pick(el.querySelector('.n-card-header, .n-card__header')),
      cnt: pick(el.querySelector('.n-card__content, .n-card-content')),
    }))
    const dark = [...document.querySelectorAll('div')]
      .filter((el) => {
        const bg = getComputedStyle(el).backgroundColor
        return bg === 'rgb(35, 46, 60)' && el.textContent?.includes('订单总额')
      })
      .map((el) => ({ text: el.textContent?.slice(0, 50), ...pick(el) }))
    const checkout = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('结账'))
    const grand = [...document.querySelectorAll('div')].find(
      (el) => el.textContent?.includes('CNY') && getComputedStyle(el).fontSize === '36px',
    )
    return { cards, dark, checkout: pick(checkout), grand: pick(grand) }
  })
  console.log(port, JSON.stringify(d, null, 2))
  await b.close()
}

await probe(7001)
await probe(7002)
