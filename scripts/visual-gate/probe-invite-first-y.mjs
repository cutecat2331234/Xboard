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
  await p.waitForTimeout(4000)
  const info = await p.evaluate(() => {
    const card = document.querySelector('.n-card')
    const section = document.querySelector('section')
    return {
      cardY: card ? Math.round(card.getBoundingClientRect().y) : null,
      sectionPad: section ? getComputedStyle(section).padding : null,
      sectionBg: section ? getComputedStyle(section).backgroundColor : null,
      mainBg: document.querySelector('.app-main') ? getComputedStyle(document.querySelector('.app-main')).backgroundColor : null,
    }
  })
  console.log(base, JSON.stringify(info))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
