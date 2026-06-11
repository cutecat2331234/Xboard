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
    const walk = (el, depth = 0) => {
      if (!el || depth > 4) return null
      const r = el.getBoundingClientRect()
      const st = getComputedStyle(el)
      return {
        tag: el.tagName,
        cls: el.className?.toString?.().slice(0, 100),
        h: Math.round(r.height),
        y: Math.round(r.top),
        pad: st.padding,
        mt: st.marginTop,
        bg: st.backgroundColor,
        kids: [...el.children].map((c) => walk(c, depth + 1)).filter(Boolean),
      }
    }
    return walk(card)
  })
  console.log(`\n=== ${port} ===`)
  console.log(JSON.stringify(info, null, 2))
}

await b.close()
