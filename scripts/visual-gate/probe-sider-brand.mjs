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
  const info = await p.evaluate(() => {
    const sider = document.querySelector('.n-layout-sider')
    const firstChild = sider?.firstElementChild
    return {
      siderHtml: sider?.innerHTML?.slice(0, 400),
      firstChildCls: firstChild?.className?.toString?.().slice(0, 80),
      firstChildH: Math.round(firstChild?.getBoundingClientRect().height ?? 0),
      menuTop: Math.round(document.querySelector('.n-menu')?.getBoundingClientRect().top ?? 0),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
