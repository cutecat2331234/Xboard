import { chromium } from 'playwright'

const email = 'admin@example.com'
const pass = 'your-password'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()
await p.goto('http://127.0.0.1:7001/#/login', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2000)
await p.locator('input[placeholder*="邮箱"]').first().fill(email)
await p.locator('input[type="password"]').first().fill(pass)
await p.locator('.n-button--primary-type').last().click()
await p.waitForTimeout(3000)
await p.goto('http://127.0.0.1:7001/#/invite', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2500)
const info = await p.evaluate(() => {
  const tables = document.querySelectorAll('.n-data-table').length
  const rows = [...document.querySelectorAll('.n-data-table-tr, tr, .invite')].length
  const codeSection = document.querySelectorAll('.n-card')[1]?.innerHTML?.slice(0, 800)
  const pagination = !!document.querySelector('.n-pagination')
  return { tables, rows, pagination, hasList: !!document.querySelector('ul, .n-list') }
})
console.log(JSON.stringify(info, null, 2))
await b.close()
