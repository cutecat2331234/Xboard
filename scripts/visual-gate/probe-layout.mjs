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
  const info = await p.evaluate(() => ({
    headerH: Math.round(document.querySelector('header')?.getBoundingClientRect().height ?? 0),
    siderW: Math.round(document.querySelector('.n-layout-sider')?.getBoundingClientRect().width ?? 0),
    brandH: Math.round(document.querySelector('.n-layout-sider > div')?.getBoundingClientRect().height ?? 0),
    menuSelected: document.querySelector('.n-menu-item-content--selected')?.textContent?.trim(),
    headerHtml: document.querySelector('header')?.outerHTML?.slice(0, 1200),
    userBlock: document.querySelector('header')?.innerText?.split('\n').slice(-3),
  }))
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
