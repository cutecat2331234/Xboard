import { chromium } from 'playwright'

const email = 'admin@example.com'
const pass = 'your-password'

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
  await p.goto(`${base}/#/invite`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const main = document.querySelector('.app-main, .shell-main')
    return {
      mainH: Math.round(main?.getBoundingClientRect().height ?? 0),
      balance: document.querySelector('.invite-balance')?.textContent?.trim(),
      balanceFont: document.querySelector('.invite-balance') ? getComputedStyle(document.querySelector('.invite-balance')).fontSize : null,
      buttons: [...document.querySelectorAll('.invite-actions .n-button')].map((b) => ({
        text: b.textContent?.trim(),
        h: Math.round(b.getBoundingClientRect().height),
      })),
      headerExtra: document.querySelector('.n-card-header__extra, .n-card-header-extra')?.innerHTML?.slice(0, 150),
      copyLink: document.querySelector('.invite-copy')?.textContent,
      paginationCount: document.querySelectorAll('.n-pagination').length,
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
