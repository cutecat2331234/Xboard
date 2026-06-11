import { chromium } from 'playwright'

const email = 'admin@example.com'
const pass = 'your-password'

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
    const wrap = document.querySelector('.n-data-table-tbody td div')
    const span = wrap?.querySelector('span')
    const btn = wrap?.querySelector('button')
    return {
      wrapDisplay: wrap ? getComputedStyle(wrap).display : null,
      wrapGap: wrap ? getComputedStyle(wrap).gap : null,
      spanW: span?.getBoundingClientRect().width,
      spanFf: span ? getComputedStyle(span).fontFamily : null,
      spanFs: span ? getComputedStyle(span).fontSize : null,
      btnMl: btn ? getComputedStyle(btn).marginLeft : null,
      gap: span && btn ? btn.getBoundingClientRect().x - span.getBoundingClientRect().right : null,
    }
  })
  console.log(base, JSON.stringify(info))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
