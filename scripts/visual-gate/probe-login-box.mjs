import { chromium } from 'playwright'

async function box(base, route) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`${base}/#/${route}`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const info = await p.evaluate(() => {
    const card = document.querySelector('.n-card')
    const r = card?.getBoundingClientRect()
    const title = document.querySelector('h1')?.getBoundingClientRect()
    const btn = document.querySelector('.n-button--primary-type')?.getBoundingClientRect()
    const footer = document.querySelector('.n-card')?.lastElementChild?.getBoundingClientRect()
    return {
      card: r ? { w: r.width, h: r.height, y: r.y } : null,
      titleY: title?.y,
      btnH: btn?.height,
      footerText: document.querySelector('.n-card')?.lastElementChild?.innerText,
    }
  })
  console.log(base, route, JSON.stringify(info))
  await b.close()
}

await box('http://127.0.0.1:7001', 'login')
await box('http://127.0.0.1:7002', 'login')
await box('http://127.0.0.1:7001', 'register')
await box('http://127.0.0.1:7002', 'register')
