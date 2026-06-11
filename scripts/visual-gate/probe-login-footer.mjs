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
    const footer = card?.querySelector(':scope > .n-card__content > div:last-child')
    const body = card?.querySelector('.auth-card__body, .p-6, .n-card__content > div')
    return {
      cardH: Math.round(card?.getBoundingClientRect().height ?? 0),
      footerH: Math.round(footer?.getBoundingClientRect().height ?? 0),
      footerCls: footer?.className?.slice(0, 80),
      bodyH: Math.round(body?.getBoundingClientRect().height ?? 0),
    }
  })
  console.log(base, info)
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
