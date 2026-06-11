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
    const tables = [...document.querySelectorAll('.n-data-table')]
    return tables.map((t, i) => {
      const empty = t.querySelector('.n-data-table-empty, .n-empty')
      const pg = t.parentElement?.querySelector('.n-pagination')
      return {
        i,
        tableH: Math.round(t.getBoundingClientRect().height),
        emptyH: empty ? Math.round(empty.getBoundingClientRect().height) : 0,
        pgH: pg ? Math.round(pg.getBoundingClientRect().height) : 0,
        wrapperH: Math.round((t.parentElement?.getBoundingClientRect().height) ?? 0),
      }
    })
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
