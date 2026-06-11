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
    const cards = [...document.querySelectorAll('.n-card')].map((c) => ({
      h: Math.round(c.getBoundingClientRect().height),
      title: c.querySelector('.n-card-header__main')?.textContent?.trim(),
    }))
    const shortcuts = document.querySelectorAll('.shortcut-item, [class*="shortcut"]').length
    const li = [...document.querySelectorAll('li')].slice(0, 8).map((l) => ({
      cls: l.className,
      h: Math.round(l.getBoundingClientRect().height),
      html: l.innerHTML.slice(0, 120),
    }))
    return { cards, shortcuts, li }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
