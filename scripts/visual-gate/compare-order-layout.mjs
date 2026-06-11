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
        className: String(el.className || '').slice(0, 100),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        bg: s.backgroundColor,
        padding: s.padding,
        margin: s.margin,
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
      }
    }
    const byText = (t) => {
      const el = [...document.querySelectorAll('*')].find(
        (n) => n.childNodes.length <= 3 && n.textContent?.trim() === t,
      )
      return pick(el?.closest('.n-card') || el?.parentElement?.parentElement || el)
    }
    const scroll = document.querySelector('.cus-scroll-y, .app-scroll-main, article .overflow-auto, .shell-main')
    const summary = [...document.querySelectorAll('div')].find(
      (el) => el.textContent?.includes('订单总额') && el.querySelector('button') && getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)',
    )
    const checkoutBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('结账'))
    const closeBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('关闭订单'))
    const infoRows = [...document.querySelectorAll('.info-row, div')].filter(
      (el) => el.classList?.contains?.('info-row') || (el.textContent?.startsWith('产品名称') && el.children?.length >= 2),
    ).slice(0, 3).map(pick)
    return {
      scroll: pick(scroll),
      productCard: byText('商品信息'),
      orderCard: byText('订单信息'),
      payCard: byText('支付方式'),
      summary: pick(summary),
      checkoutBtn: pick(checkoutBtn),
      closeBtn: pick(closeBtn),
      infoRows,
      mainBg: pick(document.querySelector('.cus-scroll-y, .app-scroll-main, article > div:last-child')),
    }
  })

  const out = path.dirname(fileURLToPath(import.meta.url))
  fs.writeFileSync(path.join(out, `layout-${tag}.json`), JSON.stringify(data, null, 2))
  console.log(tag, JSON.stringify(data, null, 2))
  await browser.close()
}

await inspect('http://127.0.0.1:7001', '7001')
await inspect('http://127.0.0.1:7002', '7002')
