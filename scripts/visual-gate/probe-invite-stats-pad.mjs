import { chromium } from 'playwright'

const email = 'admin@xboard.local'
const pass = 'Xboard@2026'

async function probe(base) {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
  await ctx.addInitScript(() => localStorage.setItem('xboard_locale', 'zh-CN'))
  const p = await ctx.newPage()
  await p.goto(`${base}/#/login`)
  await p.waitForTimeout(2000)
  await p.locator('input[placeholder*="邮箱"]').first().fill(email)
  await p.locator('input[type="password"]').first().fill(pass)
  await p.locator('.n-button--primary-type').last().click()
  await p.waitForTimeout(3000)
  await p.goto(`${base}/#/invite`)
  await p.waitForTimeout(3000)
  const info = await p.evaluate(() => {
    const card = document.querySelectorAll('.n-card')[1]
    const content = card?.querySelector('.n-card__content, .n-card-content')
    const rows = [...(content?.querySelectorAll('.flex') || [])]
    return {
      cardH: Math.round(card?.getBoundingClientRect().height ?? 0),
      contentPad: content ? getComputedStyle(content).padding : null,
      contentH: Math.round(content?.getBoundingClientRect().height ?? 0),
      rows: rows.map((r) => ({
        h: Math.round(r.getBoundingClientRect().height),
        pt: getComputedStyle(r).paddingTop,
        pb: getComputedStyle(r).paddingBottom,
        lh: getComputedStyle(r).lineHeight,
      })),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
