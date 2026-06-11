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
  const info = await p.evaluate(() =>
    [...document.querySelectorAll('.n-card')].slice(0, 3).map((c, i) => ({
      i,
      shadow: getComputedStyle(c).boxShadow,
      border: getComputedStyle(c).border,
      radius: getComputedStyle(c).borderRadius,
    })),
  )
  console.log(base, route, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001', 'invite')
await probe('http://127.0.0.1:7002', 'invite')
await probe('http://127.0.0.1:7001', 'dashboard')
await probe('http://127.0.0.1:7002', 'dashboard')
