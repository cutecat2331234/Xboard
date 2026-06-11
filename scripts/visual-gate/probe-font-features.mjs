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
  await p.evaluate(() => document.fonts.ready)
  const info = await p.evaluate(() => {
    const span = document.querySelector('.text-5xl')
    const cs = span ? getComputedStyle(span) : null
    const fonts = [...document.fonts].filter((f) => f.family.includes('Encode')).map((f) => `${f.family} ${f.weight} ${f.status}`)
    return {
      letterSpacing: cs?.letterSpacing,
      fontVariant: cs?.fontVariant,
      fontFeatureSettings: cs?.fontFeatureSettings,
      fontVariationSettings: cs?.fontVariationSettings,
      text: span?.textContent,
      width: span?.getBoundingClientRect().width,
      fontsLoaded: fonts.slice(0, 6),
    }
  })
  console.log(base, JSON.stringify(info, null, 2))
  await b.close()
}

await probe('http://43.248.77.134:7001')
await probe('http://43.248.77.134:7002')
