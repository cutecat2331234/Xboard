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
    const card = [...document.querySelectorAll('.n-card')].find((c) => c.textContent?.includes('我的钱包'))
    const pick = (sel) => {
      const el = card?.querySelector(sel)
      if (!el) return null
      const cs = getComputedStyle(el)
      return { fs: cs.fontSize, lh: cs.lineHeight, mar: cs.margin, h: Math.round(el.getBoundingClientRect().height) }
    }
    return {
      cardH: Math.round(card?.getBoundingClientRect().height ?? 0),
      amount: pick('.wallet-amount, .text-5xl, span'),
      currency: pick('.wallet-currency'),
      meta: pick('.wallet-meta, .text-gray-500'),
      content: pick('.n-card-content, .n-card__content'),
    }
  })
  console.log(base, JSON.stringify(info))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
