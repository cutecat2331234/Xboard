import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

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
  const info = await p.evaluate(() => {
    const items = [...document.querySelectorAll('.n-list-item')]
    return items.map((li, i) => {
      const svg = li.querySelector('svg')
      const parent = svg?.parentElement
      const cs = svg ? getComputedStyle(svg) : null
      const pcs = parent ? getComputedStyle(parent) : null
      return {
        i,
        parentTag: parent?.tagName,
        parentCls: parent?.className,
        svgCls: svg?.getAttribute('class'),
        svgW: svg?.getBoundingClientRect().width,
        svgH: svg?.getBoundingClientRect().height,
        fs: cs?.fontSize,
        lh: cs?.lineHeight,
        color: cs?.color,
        display: cs?.display,
        parentDisplay: pcs?.display,
        outer: svg?.outerHTML?.slice(0, 300),
      }
    })
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
