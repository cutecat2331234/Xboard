import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)

const refBase = 'http://43.248.77.134:7001'
const cmpBase = 'http://43.248.77.134:7002'
const email = 'admin@xboard.local'
const password = 'Xboard@2026'
const securePath = 'd7f5c92b'

async function passportLogin(base, apiVersion = 'v2') {
  const res = await fetch(`${base}/api/${apiVersion}/passport/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  return json.data?.auth_data
}

async function ensureFixtures(base) {
  const adminAuth = await passportLogin(base, 'v2')
  const adminHdr = { Authorization: adminAuth, Accept: 'application/json', 'Content-Type': 'application/json' }
  const adminPrefix = `${base}/api/v2/${securePath}`
  let plansJson = await fetch(`${adminPrefix}/plan/fetch`, { headers: adminHdr }).then((r) => r.json())
  let planId = plansJson.data?.[0]?.id
  if (!planId) return ''
  const userAuth = await passportLogin(base, 'v1')
  const userHdr = { Authorization: userAuth, Accept: 'application/json', 'Content-Type': 'application/json' }
  const ordersJson = await fetch(`${base}/api/v1/user/order/fetch`, { headers: userHdr }).then((r) => r.json())
  const pending = ordersJson.data?.find((o) => o.status === 0)
  if (pending?.trade_no) {
    await fetch(`${base}/api/v1/user/order/cancel`, {
      method: 'POST',
      headers: userHdr,
      body: JSON.stringify({ trade_no: pending.trade_no }),
    }).catch(() => {})
  }
  let tradeNo = ''
  const saveJson = await fetch(`${base}/api/v1/user/order/save`, {
    method: 'POST',
    headers: userHdr,
    body: JSON.stringify({ plan_id: planId, period: 'month_price' }),
  }).then((r) => r.json())
  if (saveJson.status === 'success' && saveJson.data) tradeNo = saveJson.data
  if (!tradeNo) {
    const assignJson = await fetch(`${adminPrefix}/order/assign`, {
      method: 'POST',
      headers: adminHdr,
      body: JSON.stringify({
        email,
        plan_id: planId,
        period: 'month_price',
        total_amount: 10000,
      }),
    }).then((r) => r.json())
    if (assignJson.status === 'success' && assignJson.data) tradeNo = assignJson.data
  }
  return tradeNo
}

async function probe(base, tradeNo, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  await page.goto(`${base}/#/login`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.locator('input[type="email"], input[placeholder*="邮箱"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await page.locator('button[type="submit"], .n-button--primary-type').last().click()
  await page.waitForTimeout(2500)
  await page.goto(`${base}/#/order/${tradeNo}`, { waitUntil: 'networkidle', timeout: 120000 })
  await page.waitForSelector('.order-detail-page, .summary-panel, .n-card', { timeout: 45000 }).catch(() => {})
  await page
    .waitForFunction(
      () => {
        const card = document.querySelector('.pay-card')
        if (!card) return Boolean(document.querySelector('.summary-panel'))
        return card.querySelector('.pay-option') || card.textContent?.includes('支付方式')
      },
      { timeout: 20000 },
    )
    .catch(() => {})
  await page.waitForTimeout(3000)

  const data = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        text: el.textContent?.slice(0, 60),
        fontSize: s.fontSize,
        padding: s.padding,
        margin: s.margin,
        bg: s.backgroundColor,
      }
    }
    const cards = [...document.querySelectorAll('.n-card')].map((el, i) => {
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        i,
        title: el.querySelector('.n-card-header__main')?.textContent?.trim(),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        margin: s.margin,
      }
    })
    const orderStatus = document.querySelector('.order-detail-page') ? 'loaded' : 'missing'
    const statusText = document.body.innerText.match(/待支付|已取消|已完成/)?.[0]
    return {
      orderStatus,
      statusText,
      page: pick('.order-detail-page'),
      main: pick('.order-detail-main'),
      aside: pick('.order-detail-aside'),
      summary: pick('.summary-panel'),
      scroll: pick('.app-scroll-main, .cus-scroll-y'),
      cards,
      payOptions: document.querySelectorAll('.pay-option').length,
      closeBtn: pick('.n-card-header-extra .n-button'),
      payCard: pick('.pay-card'),
    }
  })
  console.log(tag, JSON.stringify(data, null, 2))
  await browser.close()
  return data
}

const tradeNo = await ensureFixtures(refBase)
console.log('tradeNo', tradeNo)
await probe(refBase, tradeNo, '7001')
await probe(cmpBase, tradeNo, '7002')
