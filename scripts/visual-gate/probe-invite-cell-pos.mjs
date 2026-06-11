import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

async function probe(base) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2000)
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
  await p.goto(`${base}/#/invite`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(3000)
  const info = await p.evaluate(() => {
    const cell = document.querySelector('.n-data-table-tbody td')
    const wrap = cell?.querySelector('div')
    const span = wrap?.querySelector('span')
    const btn = wrap?.querySelector('button')
    return {
      wrap: wrap ? { w: Math.round(wrap.getBoundingClientRect().width), display: getComputedStyle(wrap).display } : null,
      span: span ? { x: Math.round(span.getBoundingClientRect().x), w: Math.round(span.getBoundingClientRect().width) } : null,
      btn: btn ? { x: Math.round(btn.getBoundingClientRect().x), w: Math.round(btn.getBoundingClientRect().width), mar: getComputedStyle(btn).marginLeft } : null,
      table: document.querySelector('.n-data-table-base-table') ? Math.round(document.querySelector('.n-data-table-base-table').getBoundingClientRect().width) : null,
    }
  })
  console.log(base, JSON.stringify(info))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
