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
  const info = await p.evaluate(() =>
    [...document.querySelectorAll('.n-card')].map((card, i) => {
      const header = card.querySelector('.n-card-header, .n-card__header')
      const content = card.querySelector('.n-card__content, .n-card-content')
      return {
        i,
        hasHeader: Boolean(header),
        headerPad: header ? getComputedStyle(header).padding : null,
        contentPad: content ? getComputedStyle(content).padding : null,
        cardH: Math.round(card.getBoundingClientRect().height),
      }
    }),
  )
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
