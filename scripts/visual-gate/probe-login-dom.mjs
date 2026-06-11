import { chromium } from 'playwright'

async function probe(base) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const card = document.querySelector('.n-card')
    const parts = [...card.querySelectorAll('.auth-field, .auth-card__body > form > *, .p-6 > *, .auth-card__footer-bar, .n-card__content > div > *')].map((el) => ({
      tag: el.tagName,
      cls: el.className?.slice?.(0, 40),
      h: Math.round(el.getBoundingClientRect().height),
    }))
    return { cardH: Math.round(card.getBoundingClientRect().height), parts }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
