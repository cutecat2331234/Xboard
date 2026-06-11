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
  await p.goto(`${base}/#/dashboard`, { waitUntil: 'networkidle' }).catch(() => {})
  await p.waitForTimeout(3000)
  await p.waitForFunction(() => {
    const card = [...document.querySelectorAll('.n-card')].find((c) => c.textContent?.includes('我的订阅'))
    return card && !card.querySelector('.n-skeleton')
  }).catch(() => {})
  const html = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.n-card')]
    const sub = cards.find((c) => c.textContent?.includes('我的订阅'))
    const shortcuts = cards.find((c) => c.textContent?.includes('捷径'))
    return {
      sub: sub?.outerHTML?.replace(/data-v-[a-f0-9]+=""/g, ''),
      shortcuts: shortcuts?.outerHTML?.replace(/data-v-[a-f0-9]+=""/g, ''),
    }
  })
  console.log('===', base, 'SUB LEN', html.sub?.length, 'SHORT LEN', html.shortcuts?.length)
  console.log(html.shortcuts?.slice(0, 2000))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
