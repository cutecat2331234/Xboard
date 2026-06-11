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
    const card = document.querySelectorAll('.n-card')[0]
    const header = card?.querySelector('.n-card-header')
    const content = card?.querySelector('.n-card__content, .n-card-content')
    return {
      cardH: Math.round(card?.getBoundingClientRect().height ?? 0),
      border: card ? getComputedStyle(card).border : null,
      boxShadow: card ? getComputedStyle(card).boxShadow : null,
      headerH: Math.round(header?.getBoundingClientRect().height ?? 0),
      headerBorder: header ? getComputedStyle(header).borderBottom : null,
      contentH: Math.round(content?.getBoundingClientRect().height ?? 0),
      contentPad: content ? getComputedStyle(content).padding : null,
    }
  })
  console.log(base, JSON.stringify(info))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
