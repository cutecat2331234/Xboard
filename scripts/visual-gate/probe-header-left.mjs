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
  await p.goto(`${base}/#/dashboard`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const header = document.querySelector('header, .app-header')
    const left = header?.firstElementChild
    const kids = [...(left?.children ?? [])].map((c) => ({
      tag: c.tagName,
      cls: c.className?.toString?.().slice(0, 70),
      x: Math.round(c.getBoundingClientRect().x),
      w: Math.round(c.getBoundingClientRect().width),
    }))
    const crumb = document.querySelector('.n-breadcrumb')
    const user = document.querySelector('[class*="user"], .n-avatar')?.parentElement
    return {
      leftGap: left ? getComputedStyle(left).gap : null,
      leftPad: left ? getComputedStyle(left).padding : null,
      kids,
      crumbX: Math.round(crumb?.getBoundingClientRect().x ?? 0),
      userX: Math.round(user?.getBoundingClientRect().x ?? 0),
      siderH: Math.round(document.querySelector('.n-layout-sider')?.getBoundingClientRect().height ?? 0),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
