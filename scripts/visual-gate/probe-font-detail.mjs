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
  await p.goto(`${base}/#/dashboard`, { waitUntil: 'networkidle' }).catch(() => {})
  await p.waitForTimeout(3000)
  const info = await p.evaluate(() => {
    const body = getComputedStyle(document.body)
    const menu = document.querySelector('.n-menu-item-content-header')
    const mcs = menu ? getComputedStyle(menu) : null
    const title = document.querySelector('.text-base')
    const tcs = title ? getComputedStyle(title) : null
    return {
      body: { font: body.fontFamily, size: body.fontSize, lh: body.lineHeight, fw: body.fontWeight, ls: body.letterSpacing },
      menu: mcs ? { font: mcs.fontFamily, size: mcs.fontSize, lh: mcs.lineHeight, fw: mcs.fontWeight } : null,
      title: tcs ? { font: tcs.fontFamily, size: tcs.fontSize, lh: tcs.lineHeight, fw: tcs.fontWeight } : null,
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
