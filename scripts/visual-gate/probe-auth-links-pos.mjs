import { chromium } from 'playwright'

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()

for (const port of ['7001', '7002']) {
  await p.goto(`http://43.248.77.134:${port}/#/login`, { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(2000)
  const info = await p.evaluate(() => {
    const card = document.querySelector('.n-card')
    const els = [...card.querySelectorAll('a, button, .n-divider')].map((el) => {
      const r = el.getBoundingClientRect()
      return {
        tag: el.tagName,
        text: el.textContent?.trim().slice(0, 30),
        y: Math.round(r.top),
        visible: el.offsetParent !== null,
        parentCls: el.parentElement?.className?.slice(0, 50),
      }
    })
    return els.filter((e) => e.visible)
  })
  console.log(`\n=== ${port} login links/buttons by Y ===`)
  info.sort((a, b) => a.y - b.y).forEach((e) => console.log(e))
}

await b.close()
