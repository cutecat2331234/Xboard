import { chromium } from 'playwright'

const email = 'admin@example.com'
const pass = 'your-password'

async function probe(base) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`)
  await p.waitForTimeout(2000)
  await p.locator('input[placeholder*="邮箱"], input[type="email"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
  const before = await p.evaluate(() => ({
    ls: { ...localStorage },
    bodyBg: getComputedStyle(document.body).backgroundColor,
    layoutBg: document.querySelector('.n-layout') ? getComputedStyle(document.querySelector('.n-layout')).backgroundColor : null,
  }))
  const themeIcon = p.locator('header .cursor-pointer, header svg').first()
  await themeIcon.click().catch(() => {})
  await p.waitForTimeout(500)
  const afterTheme = await p.evaluate(() => ({
    ls: { ...localStorage },
    bodyBg: getComputedStyle(document.body).backgroundColor,
    dark: document.documentElement.className,
  }))
  const langBtn = p.locator('header .n-button, header button').first()
  await langBtn.click().catch(() => {})
  await p.waitForTimeout(500)
  const dropdown = await p.locator('.n-dropdown, .n-popover').count()
  const afterLang = await p.evaluate(() => ({ ls: { ...localStorage } }))
  console.log(base, JSON.stringify({ before, afterTheme, dropdown, afterLang }, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
