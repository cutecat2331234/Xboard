import { chromium } from 'playwright'

const email = 'admin@example.com'
const pass = 'your-password'

async function probe(base, route) {
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
  await p.goto(`${base}/#/${route}`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const card = [...document.querySelectorAll('.n-card')].find((c) => c.getBoundingClientRect().width > 200)
    const content = card?.querySelector('.n-card-content, .n-card__content')
    return [...(content?.children ?? [])].map((c) => ({
      cls: c.className,
      tag: c.tagName,
      h: Math.round(c.getBoundingClientRect().height),
      margin: getComputedStyle(c).margin,
      lineHeight: getComputedStyle(c).lineHeight,
      fontSize: getComputedStyle(c).fontSize,
    }))
  })
  console.log(base, route, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001', 'invite')
await probe('http://127.0.0.1:7002', 'invite')
await probe('http://127.0.0.1:7001', 'profile')
await probe('http://127.0.0.1:7002', 'profile')
