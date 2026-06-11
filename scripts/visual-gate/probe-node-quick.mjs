import { chromium } from 'playwright'
const REF = 'http://43.248.77.134:7001'
const CMP = 'http://43.248.77.134:7002'
const EMAIL = 'admin@xboard.local'
const PASS = 'Xboard@2026'

async function login(page, base) {
  await page.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.locator('input[placeholder*="邮箱"], input[placeholder*="Email"]').first().fill(EMAIL)
  await page.locator('input[type="password"]').first().fill(PASS)
  await page.locator('form .auth-submit, form .n-button--primary-type, button:has-text("登入")').first().click()
  await page.waitForTimeout(2500)
}

for (const base of [REF, CMP]) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await login(p, base)
  await p.goto(`${base}/#/node`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2000)
  const html = await p.evaluate(() => {
    const links = [...document.querySelectorAll('a')].map((a) => ({ text: a.textContent?.trim(), href: a.getAttribute('href') }))
    return { links, text: document.body.innerText.slice(0, 400), serverCount: document.querySelectorAll('.n-data-table tbody tr').length }
  })
  console.log('\n===', base, '===')
  console.log(JSON.stringify(html, null, 2))
  await b.close()
}
