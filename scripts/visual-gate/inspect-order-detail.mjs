import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const pwPath = path.join(root, 'scripts/visual-gate/node_modules/playwright/index.mjs')
const { chromium } = await import(pathToFileURL(pwPath).href)

async function inspect(base, tag) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(`${base}/#/login`)
  await page.locator('input[type="email"], input[placeholder*="邮箱"]').first().fill('admin@xboard.local')
  await page.locator('input[type="password"]').first().fill('Xboard@2026')
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
    const cards = [...document.querySelectorAll('.n-card')]
    const summary = document.querySelector('[class*="summary"]') ||
      [...document.querySelectorAll('div')].find((el) => el.textContent?.includes('订单总额') && el.querySelector('button'))
    const pick = (el) => {
      if (!el) return null
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        tag: el.tagName,
        className: el.className?.slice?.(0, 120),
        text: el.textContent?.slice(0, 40),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        bg: s.backgroundColor,
        color: s.color,
        padding: s.padding,
        margin: s.margin,
        borderRadius: s.borderRadius,
        fontSize: s.fontSize,
      }
    }
    return {
      cards: cards.map(pick),
      summary: pick(summary),
      main: pick(document.querySelector('.n-layout-scroll-container > div:last-child, .order-detail-page, main')),
      grid: pick(document.querySelector('.n-grid')),
      htmlSnippet: document.querySelector('.n-layout-scroll-container')?.innerHTML?.slice(0, 15000),
    }
  })

  const out = path.dirname(fileURLToPath(import.meta.url))
  fs.writeFileSync(path.join(out, `inspect-${tag}.json`), JSON.stringify(data, null, 2))
  if (data.htmlSnippet) fs.writeFileSync(path.join(out, `inspect-${tag}.html`), data.htmlSnippet)
  console.log(tag, JSON.stringify(data.cards?.length), data.summary)
  await browser.close()
}

await inspect('http://43.248.77.134:7001', '7001')
await inspect('http://43.248.77.134:7002', '7002')
