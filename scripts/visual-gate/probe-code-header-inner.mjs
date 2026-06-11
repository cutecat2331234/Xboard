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
    const card = document.querySelectorAll('.n-card')[2]
    const header = card?.querySelector('.n-card-header, .n-card__header')
    const main = header?.querySelector('.n-card-header__main, .n-card__header__main')
    const extra = header?.querySelector('.n-card-header__extra, .n-card-header-extra')
    const btn = extra?.querySelector('button')
    return {
      headerExactH: header?.getBoundingClientRect().height,
      mainH: main?.getBoundingClientRect().height,
      extraH: extra?.getBoundingClientRect().height,
      btnH: btn?.getBoundingClientRect().height,
      headerPad: header ? getComputedStyle(header).padding : null,
      mainLh: main ? getComputedStyle(main).lineHeight : null,
      mainFs: main ? getComputedStyle(main).fontSize : null,
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
