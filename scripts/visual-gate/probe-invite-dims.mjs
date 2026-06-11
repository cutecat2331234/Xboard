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
  await p.goto(`${base}/#/invite`, { waitUntil: 'networkidle' }).catch(() => {})
  await p.waitForTimeout(3000)
  const info = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.n-card')].map((c, i) => ({
      i,
      h: Math.round(c.getBoundingClientRect().height),
      y: Math.round(c.getBoundingClientRect().y),
    }))
    const tables = [...document.querySelectorAll('.n-data-table')].map((t, i) => ({
      i,
      cls: t.className,
      h: Math.round(t.getBoundingClientRect().height),
      y: Math.round(t.getBoundingClientRect().y),
    }))
    const balance = document.querySelector('.text-5xl')
    return {
      cards,
      tables,
      balance: balance
        ? {
            text: balance.textContent,
            fs: getComputedStyle(balance).fontSize,
            ff: getComputedStyle(balance).fontFamily,
          }
        : null,
      paginations: [...document.querySelectorAll('.n-pagination')].map((pg) => ({
        y: Math.round(pg.getBoundingClientRect().y),
        h: Math.round(pg.getBoundingClientRect().height),
      })),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
