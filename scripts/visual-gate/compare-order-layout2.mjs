import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)

async function inspect(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  await page.goto(`${base}/#/login`)
  await page.locator('input[type="email"], input[placeholder*="邮箱"]').first().fill('admin@example.com')
  await page.locator('input[type="password"]').first().fill('your-password')
  await page.locator('button[type="submit"], .n-button--primary-type').last().click()
  await page.waitForTimeout(3000)
  const tradeNo = await page.evaluate(async () => {
    const h = { Authorization: localStorage.getItem('xboard_auth_data'), Accept: 'application/json' }
    const j = await (await fetch('/api/v1/user/order/fetch', { headers: h })).json()
    return j.data?.find((o) => o.status === 0)?.trade_no ?? j.data?.[0]?.trade_no
  })
  await page.goto(`${base}/#/order/${tradeNo}`)
  await page.waitForTimeout(4000)

  const data = await page.evaluate(() => {
    const pick = (el) => {
      if (!el) return null
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        tag: el.tagName,
        className: String(el.className || '').slice(0, 120),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        bg: s.backgroundColor,
        padding: s.padding,
        margin: s.margin,
        fontSize: s.fontSize,
        color: s.color,
      }
    }
    const cardByTitle = (title) => {
      const headers = [...document.querySelectorAll('.n-card-header, .n-card__header')]
      const h = headers.find((el) => el.textContent?.includes(title))
      return pick(h?.closest('.n-card'))
    }
    const darkPanel = [...document.querySelectorAll('div')].find((el) => {
      const bg = getComputedStyle(el).backgroundColor
      return bg === 'rgb(35, 46, 60)' || bg === 'rgb(32, 42, 54)' || bg === 'rgb(31, 41, 55)'
    })
    const checkoutBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === '结账')
    const closeBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === '关闭订单')
    const grid = document.querySelector('.n-grid, .n-flex')
    const labels = [...document.querySelectorAll('*')].filter((el) => el.textContent?.trim() === '产品名称：').map((el) => pick(el))
    const cardContent = document.querySelector('.n-card .n-card__content, .n-card .n-card-content')
    const firstRow = [...document.querySelectorAll('div')].find(
      (el) => el.textContent?.includes('产品名称') && el.textContent?.includes('Gate Test Plan') && el.children.length >= 2,
    )
    return {
      cards: ['商品信息', '订单信息', '支付方式'].map((t) => ({ title: t, ...cardByTitle(t) })),
      darkPanel: pick(darkPanel),
      checkoutBtn: pick(checkoutBtn),
      closeBtn: pick(closeBtn),
      grid: pick(grid),
      labelEl: labels[0],
      firstRow: pick(firstRow),
      cardContent: pick(cardContent),
      cardHeader: pick(document.querySelector('.n-card-header, .n-card__header')),
    }
  })

  const out = path.dirname(fileURLToPath(import.meta.url))
  fs.writeFileSync(path.join(out, `layout2-${tag}.json`), JSON.stringify(data, null, 2))
  console.log(tag, JSON.stringify(data, null, 2))
  await browser.close()
}

await inspect('http://127.0.0.1:7001', '7001')
await inspect('http://127.0.0.1:7002', '7002')
