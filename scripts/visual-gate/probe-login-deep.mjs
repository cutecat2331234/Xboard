import { chromium } from 'playwright'

async function probe(base) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const card = document.querySelector('.auth-page .n-card') || document.querySelector('.auth-card')
    const content = card?.querySelector('.n-card__content')
    const anyCard = document.querySelector('.auth-page .n-card')
    const kids = [...(content?.children || [])].map((el) => ({
      cls: el.className.slice(0, 80),
      h: Math.round(el.getBoundingClientRect().height),
    }))
    const fields = [...document.querySelectorAll('.auth-field')].map((el) => ({
      display: getComputedStyle(el).display,
      h: Math.round(el.getBoundingClientRect().height),
      mt: getComputedStyle(el).marginTop,
    }))
    const cardChildren = card ? [...card.children].map((el) => ({
      tag: el.tagName,
      cls: el.className?.toString?.().slice(0, 80),
      h: Math.round(el.getBoundingClientRect().height),
      pad: getComputedStyle(el).padding,
    })) : []
    return {
      cardH: Math.round(card?.getBoundingClientRect().height ?? 0),
      cardChildren,
      anyCardCls: anyCard?.className?.slice(0, 100),
      hasContent: Boolean(content),
      contentPad: content ? getComputedStyle(content).padding : null,
      kids,
      fields,
      fieldCount: fields.length,
      titleH: Math.round(document.querySelector('.auth-card__title-main, .auth-page h1')?.getBoundingClientRect().height ?? 0),
      bodyH: Math.round(document.querySelector('.auth-card__body')?.getBoundingClientRect().height ?? 0),
      footerH: Math.round(document.querySelector('.auth-card__footer-bar')?.getBoundingClientRect().height ?? 0),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://127.0.0.1:7001')
await probe('http://127.0.0.1:7002')
