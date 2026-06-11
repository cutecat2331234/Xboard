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
    const item = [...document.querySelectorAll('.n-list-item')].find((l) => l.textContent?.includes('教程'))
    const title = item?.querySelector('div div div, .shortcut-title')
    const desc = item?.querySelector('.text-gray-500, .shortcut-desc')
    return {
      titleCls: title?.className,
      titleFw: title ? getComputedStyle(title).fontWeight : null,
      descCls: desc?.className,
      descColor: desc ? getComputedStyle(desc).color : null,
      itemHtml: item?.innerHTML?.slice(0, 300),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
