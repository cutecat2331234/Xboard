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
    const cards = [...document.querySelectorAll('.n-card')]
    const codeCard = cards[2]
    const incomeCard = cards[3]
    const t0 = codeCard?.querySelector('.n-data-table')
    const t1 = incomeCard?.querySelector('.n-data-table')
    return {
      codeHeader: codeCard?.querySelector('.n-card-header')?.getBoundingClientRect(),
      codeContentPad: codeCard?.querySelector('.n-card__content, .n-card-content')
        ? getComputedStyle(codeCard.querySelector('.n-card__content, .n-card-content')).padding
        : null,
      table0Y: t0?.getBoundingClientRect().y,
      table0H: t0?.getBoundingClientRect().height,
      incomeHeader: incomeCard?.querySelector('.n-card-header')?.getBoundingClientRect(),
      table1Y: t1?.getBoundingClientRect().y,
      th0: document.querySelector('.n-data-table-th')?.getBoundingClientRect(),
      empty: document.querySelector('.n-data-table-empty')?.getBoundingClientRect(),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
