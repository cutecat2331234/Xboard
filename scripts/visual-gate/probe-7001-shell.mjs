import { chromium } from 'playwright'

const email = 'admin@example.com'
const pass = 'your-password'

async function probe(base, route) {
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
  await p.goto(`${base}/#/${route}`)
  await p.waitForTimeout(3000)
  const info = await p.evaluate(() => {
    const header = document.querySelector('header, .n-layout-header')
    const sider = document.querySelector('.n-layout-sider')
    const section = document.querySelector('section.cus-scroll-y, section')
    const content = document.querySelector('.n-layout-content, .app-main')
    return {
      headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
      headerCls: header?.className?.slice(0, 80),
      headerShadow: header ? getComputedStyle(header).boxShadow : null,
      siderW: sider ? Math.round(sider.getBoundingClientRect().width) : null,
      sectionCls: section?.className,
      sectionPad: section ? getComputedStyle(section).padding : null,
      sectionY: section ? Math.round(section.getBoundingClientRect().y) : null,
      contentPad: content ? getComputedStyle(content).padding : null,
      contentY: content ? Math.round(content.getBoundingClientRect().y) : null,
      brandH: Math.round(document.querySelector('.app-brand, .n-layout-sider .n-scrollbar')?.previousElementSibling?.getBoundingClientRect?.().height ?? document.querySelector('[class*="brand"]')?.getBoundingClientRect?.().height ?? 0),
    }
  })
  console.log(base, route, JSON.stringify(info, null, 2))
  await b.close()
}

for (const route of ['dashboard', 'invite', 'knowledge']) {
  await probe('http://127.0.0.1:7001', route)
  await probe('http://127.0.0.1:7002', route)
}
