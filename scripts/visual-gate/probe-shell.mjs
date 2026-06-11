import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

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
  await p.goto(`${base}/#/dashboard`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const sider = document.querySelector('.n-layout-sider')?.getBoundingClientRect()
    const header = document.querySelector('.n-layout-header')?.getBoundingClientRect()
    const breadcrumb = document.querySelector('.n-breadcrumb, .app-breadcrumb')?.outerHTML?.slice(0, 300)
    const main = document.querySelector('.n-layout-content, .app-main')?.getBoundingClientRect()
    const cards = [...document.querySelectorAll('.n-card')].map((c) => Math.round(c.getBoundingClientRect().height))
    return { siderW: sider?.width, headerH: header?.height, mainPad: main, cards, breadcrumb }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
