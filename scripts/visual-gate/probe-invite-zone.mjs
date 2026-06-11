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
  await p.evaluate(() => document.fonts?.ready)
  const info = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.n-card')]
    return {
      balance: cards[0]?.getBoundingClientRect(),
      stats: cards[1]?.getBoundingClientRect(),
      codeCard: cards[2]?.getBoundingClientRect(),
      income: cards[3]?.getBoundingClientRect(),
      statsMt: cards[1] ? getComputedStyle(cards[1]).marginTop : null,
      balanceH: cards[0] ? Math.round(cards[0].getBoundingClientRect().height) : 0,
      statsRows: cards[1]
        ? [...cards[1].querySelectorAll('.flex')].map((r) => ({
            h: Math.round(r.getBoundingClientRect().height),
            text: r.textContent?.trim(),
          }))
        : [],
      empty: document.querySelector('.n-data-table-empty')?.getBoundingClientRect(),
      pg: document.querySelector('.n-pagination')?.getBoundingClientRect(),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
