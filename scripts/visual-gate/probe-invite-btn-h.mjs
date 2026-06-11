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
  const info = await p.evaluate(() => {
    const btn = document.querySelector('.n-space .n-button--small-type')
    const amount = document.querySelector('.text-5xl')
    return {
      btnH: btn ? Math.round(btn.getBoundingClientRect().height) : null,
      btnLh: btn ? getComputedStyle(btn).lineHeight : null,
      amountH: amount ? Math.round(amount.getBoundingClientRect().height) : null,
      amountLh: amount ? getComputedStyle(amount).lineHeight : null,
      amountParentH: amount?.parentElement ? Math.round(amount.parentElement.getBoundingClientRect().height) : null,
    }
  })
  console.log(base, JSON.stringify(info))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
