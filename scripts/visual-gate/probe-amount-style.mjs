import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

async function probe(base) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`)
  await p.waitForTimeout(2000)
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
  await p.goto(`${base}/#/invite`)
  await p.waitForTimeout(3000)
  await p.evaluate(() => document.fonts.ready)
  const info = await p.evaluate(() => {
    const amount = document.querySelector('.text-5xl')
    const row = amount?.parentElement
    const cny = row?.querySelector('.text-xl')
    return {
      amount: amount
        ? {
            h: amount.getBoundingClientRect().height,
            display: getComputedStyle(amount).display,
            lh: getComputedStyle(amount).lineHeight,
            va: getComputedStyle(amount).verticalAlign,
          }
        : null,
      row: row
        ? {
            h: row.getBoundingClientRect().height,
            display: getComputedStyle(row).display,
            align: getComputedStyle(row).alignItems,
          }
        : null,
      cny: cny ? { h: cny.getBoundingClientRect().height, fs: getComputedStyle(cny).fontSize } : null,
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
