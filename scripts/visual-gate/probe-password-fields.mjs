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
  await p.goto(`${base}/#/profile`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const pwd = [...document.querySelectorAll('.n-card')].find((c) =>
      c.textContent?.includes('修改密码'),
    )
    const content = pwd?.querySelector('.n-card-content, .n-card__content')
    return {
      children: [...(content?.children ?? [])].map((c) => ({
        cls: c.className,
        tag: c.tagName,
        h: Math.round(c.getBoundingClientRect().height),
        margin: getComputedStyle(c).margin,
        gap: getComputedStyle(c).gap,
      })),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
