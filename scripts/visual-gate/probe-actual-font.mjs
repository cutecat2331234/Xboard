import { chromium } from 'playwright'

const email = 'admin@example.com'
const pass = 'your-password'

async function probe(base) {
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
  await p.goto(`${base}/#/invite`)
  await p.waitForTimeout(5000)
  await p.evaluate(async () => {
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 3000))
  })
  const info = await p.evaluate(() => {
    const span = document.querySelector('.text-5xl')
    const body = document.body
    return {
      spanFf: span ? getComputedStyle(span).fontFamily : null,
      bodyFf: getComputedStyle(body).fontFamily,
      width: span?.getBoundingClientRect().width,
      allFonts: [...document.fonts].slice(0, 10).map((f) => `${f.family} w${f.weight} ${f.status}`),
      links: [...document.querySelectorAll('link[rel=stylesheet], style')].map((el) => el.href || el.textContent?.slice(0, 80)),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
