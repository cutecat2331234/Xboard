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
  await p.waitForTimeout(8000)
  await p.evaluate(() => document.fonts.ready)
  const info = await p.evaluate(async () => {
    const faces = []
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules || []) {
          if (rule instanceof CSSFontFaceRule && rule.cssText.includes('Encode')) {
            faces.push(rule.cssText.slice(0, 300))
          }
        }
      } catch {
        /* cross-origin */
      }
    }
    const loaded = [...document.fonts]
      .filter((f) => f.family.includes('Encode') && f.status === 'loaded')
      .map((f) => ({ family: f.family, weight: f.weight, stretch: f.stretch }))
    return { faces: faces.slice(0, 4), loaded }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
