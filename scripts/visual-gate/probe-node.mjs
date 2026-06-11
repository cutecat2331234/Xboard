import { chromium } from 'playwright'

const b = await chromium.launch()
for (const port of ['7001', '7002']) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`http://127.0.0.1:${port}/#/login`, { waitUntil: 'networkidle', timeout: 120000 })
  await p.locator('input[placeholder*="邮箱"]').first().fill('admin@example.com')
  await p.locator('input[type="password"]').first().fill('your-password')
  await p.locator('.n-button--primary-type').filter({ hasText: /登入/ }).first().click()
  await p.waitForTimeout(3000)
  await p.goto(`http://127.0.0.1:${port}/#/node`, { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(2000)
  const info = await p.evaluate(() => ({
    html: document.querySelector('.shell-main, main, .n-layout-scroll-container')?.innerHTML?.slice(0, 500),
    links: [...document.querySelectorAll('a')].map((a) => ({ text: a.textContent?.trim(), href: a.getAttribute('href') })),
    hasTable: Boolean(document.querySelector('.n-data-table')),
    hasAlert: Boolean(document.querySelector('.n-alert')),
  }))
  console.log(port, JSON.stringify(info, null, 2))
  await ctx.close()
}
await b.close()
