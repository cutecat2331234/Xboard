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
  await p.goto(`${base}/#/traffic`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const header = document.querySelector('header')
    const sider = document.querySelector('.n-layout-sider, .n-layout-sider-scroll-container')
    const table = document.querySelector('.n-data-table')
    const empty = document.querySelector('.n-data-table-empty, .n-empty')
    return {
      headerBoxShadow: header ? getComputedStyle(header).boxShadow : null,
      headerBorder: header ? getComputedStyle(header).borderBottom : null,
      siderBorder: sider ? getComputedStyle(sider).borderRight : null,
      brandH: Math.round(document.querySelector('.app-brand, [class*="brand"]')?.getBoundingClientRect().height ?? 0),
      menuItemH: Math.round(document.querySelector('.n-menu-item')?.getBoundingClientRect().height ?? 0),
      tableH: Math.round(table?.getBoundingClientRect().height ?? 0),
      emptyHtml: empty?.outerHTML?.slice(0, 200) || document.querySelector('.n-data-table-td--last-row')?.textContent,
      emptyText: document.body.innerText.includes('无数据') ? '无数据' : document.body.innerText.match(/No Data|暂无|无数据/)?.[0],
      thH: Math.round(document.querySelector('.n-data-table-th')?.getBoundingClientRect().height ?? 0),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
