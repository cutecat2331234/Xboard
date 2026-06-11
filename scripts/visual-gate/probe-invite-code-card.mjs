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
    const content = card?.querySelector('.n-card__content, .n-card-content')
    const table = card?.querySelector('.n-data-table')
    return {
      cardY: Math.round(card?.getBoundingClientRect().y ?? 0),
      cardH: Math.round(card?.getBoundingClientRect().height ?? 0),
      headerH: Math.round(header?.getBoundingClientRect().height ?? 0),
      headerPad: header ? getComputedStyle(header).padding : null,
      contentY: Math.round(content?.getBoundingClientRect().y ?? 0),
      contentPad: content ? getComputedStyle(content).padding : null,
      contentH: Math.round(content?.getBoundingClientRect().height ?? 0),
      tableY: Math.round(table?.getBoundingClientRect().y ?? 0),
      tableMargin: table ? getComputedStyle(table).marginTop : null,
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
