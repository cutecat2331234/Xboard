import { chromium } from 'playwright'

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
const p = await ctx.newPage()

const sel = ['h1', 'h5', '.auth-field:nth-of-type(1)', '.auth-field:nth-of-type(2)', '.auth-submit', '.auth-card__actions', '.n-card']

for (const port of ['7001', '7002']) {
  await p.goto(`http://127.0.0.1:${port}/#/login`, { waitUntil: 'networkidle', timeout: 120000 })
  await p.waitForTimeout(2000)
  const info = await p.evaluate((sels) => {
    const out = {}
    for (const s of sels) {
      const el = document.querySelector(s)
      if (!el) { out[s] = null; continue }
      const r = el.getBoundingClientRect()
      const st = getComputedStyle(el)
      out[s] = {
        y: Math.round(r.top * 100) / 100,
        h: Math.round(r.height * 100) / 100,
        margin: st.margin,
        padding: st.padding,
        fontSize: st.fontSize,
        lineHeight: st.lineHeight,
        borderRadius: st.borderRadius,
      }
    }
    const cardKids = [...document.querySelector('.n-card')?.children || []].map((c) => ({
      cls: c.className?.slice(0, 80),
      h: Math.round(c.getBoundingClientRect().height),
      pad: getComputedStyle(c).padding,
      bg: getComputedStyle(c).backgroundColor,
    }))
    return { els: out, cardKids }
  }, sel)
  console.log(`\n=== ${port} ===`)
  console.log(JSON.stringify(info, null, 2))
}

await b.close()
