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
  await p.waitForTimeout(5000)
  const info = await p.evaluate(() => {
    const span = document.querySelector('.text-5xl')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const ff = span ? getComputedStyle(span).fontFamily : ''
    ctx.font = `48px ${ff}`
    const measured = ctx.measureText('0.00').width
    return {
      ff,
      canvasWidth: measured,
      domWidth: span?.getBoundingClientRect().width,
      htmlFont: getComputedStyle(document.documentElement).fontFamily,
      bodyFont: getComputedStyle(document.body).fontFamily,
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
